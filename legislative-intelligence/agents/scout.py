"""
Agent 1 — Legislative Scout
Reads a bill JSON, calls Mistral twice, writes ai_analysis back to the file.

Graph:
  load_bill → truncate_context → extract_structure
            → extract_opposition → compute_vote_metadata
            → assemble → save
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from mistralai.client import Mistral

from agents.state import ScoutState
from agents.prompts import (
    SCOUT_STRUCTURE_SYSTEM, SCOUT_STRUCTURE_USER,
    SCOUT_OPPOSITION_SYSTEM, SCOUT_OPPOSITION_USER,
)

load_dotenv()

_MODEL_STRUCTURED = "mistral-small-latest"
_MAX_EXPUNERE_CHARS = 8_000
_MAX_AVIZ_CHARS = 4_000


def _mistral() -> Mistral:
    return Mistral(api_key=os.getenv("MISTRAL_API_KEY"))


def _llm_json(system: str, user: str) -> dict:
    client = _mistral()
    resp = client.chat.complete(
        model=_MODEL_STRUCTURED,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    return json.loads(resp.choices[0].message.content)


# ── Nodes ─────────────────────────────────────────────────────────────────────

def load_bill(state: ScoutState) -> dict:
    path = Path(state["bill_path"])
    if not path.exists():
        return {"error": f"File not found: {path}"}
    bill = json.loads(path.read_text(encoding="utf-8"))
    return {"bill": bill, "error": None}


def truncate_context(state: ScoutState) -> dict:
    if state.get("error"):
        return {}
    ocr = state["bill"].get("ocr_content") or {}

    expunere = (ocr.get("expunere_de_motive") or "")[:_MAX_EXPUNERE_CHARS]
    aviz_parts = [
        ocr.get("aviz_ces") or "",
        ocr.get("aviz_cl") or "",
    ]
    aviz = "\n\n---\n\n".join(p for p in aviz_parts if p)[:_MAX_AVIZ_CHARS]

    if not expunere:
        return {"error": "No OCR content available for expunere_de_motive"}

    return {"expunere_text": expunere, "aviz_text": aviz}


def extract_structure(state: ScoutState) -> dict:
    if state.get("error"):
        return {}
    try:
        result = _llm_json(
            SCOUT_STRUCTURE_SYSTEM,
            SCOUT_STRUCTURE_USER.format(text=state["expunere_text"]),
        )
        return {"structure": result}
    except Exception as exc:
        return {"error": f"extract_structure failed: {exc}"}


def extract_opposition(state: ScoutState) -> dict:
    if state.get("error"):
        return {}
    aviz = state.get("aviz_text", "")
    if not aviz:
        return {"opposition": {"con_args": []}}
    try:
        result = _llm_json(
            SCOUT_OPPOSITION_SYSTEM,
            SCOUT_OPPOSITION_USER.format(text=aviz),
        )
        return {"opposition": result}
    except Exception as exc:
        return {"error": f"extract_opposition failed: {exc}"}


def compute_vote_metadata(state: ScoutState) -> dict:
    if state.get("error"):
        return {}
    bill = state["bill"]
    sessions = bill.get("vote_sessions", [])
    if not sessions:
        return {"vote_metadata": {}}

    # Use the final vote session (last in list)
    vs = sessions[-1]
    summary = vs.get("summary", {})
    total_voted = (
        summary.get("for", 0)
        + summary.get("against", 0)
        + summary.get("abstain", 0)
    )
    present = summary.get("present", 1) or 1

    controversy = round(summary.get("against", 0) / present, 3)

    if summary.get("against", 0) == 0 and summary.get("abstain", 0) < 10:
        passed_by = "unanimous"
    elif summary.get("for", 0) > present * 0.75:
        passed_by = "comfortable"
    else:
        passed_by = "slim"

    # Find dominant party (most "for" votes)
    by_party = vs.get("by_party", [])
    dominant = max(by_party, key=lambda p: p.get("for", 0), default={})

    return {
        "vote_metadata": {
            "controversy_score": controversy,
            "passed_by": passed_by,
            "dominant_party": dominant.get("party", ""),
            "vote_date": vs.get("date", ""),
            "idv": vs.get("idv"),
        }
    }


def assemble(state: ScoutState) -> dict:
    if state.get("error"):
        return {}
    structure  = state.get("structure", {})
    opposition = state.get("opposition", {})
    meta       = state.get("vote_metadata", {})

    ai_analysis = {
        "processed_at":      datetime.now(timezone.utc).isoformat(),
        "model":             _MODEL_STRUCTURED,
        "title_short":       structure.get("title_short", ""),
        "key_ideas":         structure.get("key_ideas", []),
        "impact_categories": structure.get("impact_categories", []),
        "affected_profiles": structure.get("affected_profiles", []),
        "arguments": {
            "pro": structure.get("pro_args", []),
            "con": opposition.get("con_args", []),
        },
        "controversy_score": meta.get("controversy_score", 0.0),
        "passed_by":         meta.get("passed_by", ""),
        "dominant_party":    meta.get("dominant_party", ""),
        "vote_date":         meta.get("vote_date", ""),
        "ocr_quality":       "image_pdf",
    }
    return {"ai_analysis": ai_analysis}


def save(state: ScoutState) -> dict:
    if state.get("error"):
        print(f"  [SCOUT ERROR] {state['error']}")
        return {}
    bill = state["bill"]
    bill["ai_analysis"] = state["ai_analysis"]
    path = Path(state["bill_path"])
    path.write_text(json.dumps(bill, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    title = state["ai_analysis"].get("title_short", bill.get("bill_number"))
    print(f"  [SCOUT OK] {title}")
    return {}


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_scout() -> Any:
    g = StateGraph(ScoutState)
    g.add_node("load_bill",           load_bill)
    g.add_node("truncate_context",    truncate_context)
    g.add_node("extract_structure",   extract_structure)
    g.add_node("extract_opposition",  extract_opposition)
    g.add_node("compute_vote_metadata", compute_vote_metadata)
    g.add_node("assemble",            assemble)
    g.add_node("save",                save)

    g.set_entry_point("load_bill")
    g.add_edge("load_bill",             "truncate_context")
    g.add_edge("truncate_context",      "extract_structure")
    g.add_edge("extract_structure",     "extract_opposition")
    g.add_edge("extract_opposition",    "compute_vote_metadata")
    g.add_edge("compute_vote_metadata", "assemble")
    g.add_edge("assemble",              "save")
    g.add_edge("save",                  END)

    return g.compile()


def run_scout(bill_path: str) -> dict:
    graph = build_scout()
    initial: ScoutState = {
        "bill_path":     bill_path,
        "bill":          {},
        "expunere_text": "",
        "aviz_text":     "",
        "structure":     {},
        "opposition":    {},
        "vote_metadata": {},
        "ai_analysis":   {},
        "error":         None,
    }
    result = graph.invoke(initial)
    return result.get("ai_analysis", {})
