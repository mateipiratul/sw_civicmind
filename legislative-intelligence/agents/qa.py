"""
Agent 3 — Civic Q&A
Takes a bill (dict or path) + a citizen's question, returns a plain-Romanian answer.

Graph:
  load_context → classify_intent → answer
"""
import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from mistralai.client import Mistral

from agents.state import QAState
from agents.prompts import QA_SYSTEM, QA_USER

load_dotenv()

_MODEL = "mistral-small-latest"
_MAX_OCR_CHARS = 6_000

# keyword router — no LLM needed for this
_INTENT_KEYWORDS = {
    "impact":     ["afectează", "impact", "înseamnă pentru mine", "ce schimbă", "cum mă"],
    "vote_info":  ["votat", "vot", "partid", "deputat", "parlamentar", "împotrivă", "pentru"],
    "arguments":  ["argumente", "pro", "contra", "critici", "aviz", "cons", "pros"],
}


def _mistral() -> Mistral:
    return Mistral(api_key=os.getenv("MISTRAL_API_KEY"))


# ── Nodes ─────────────────────────────────────────────────────────────────────

def load_context(state: QAState) -> dict:
    bill = state["bill"]
    ai   = bill.get("ai_analysis") or {}
    ocr  = bill.get("ocr_content") or {}

    # Build context string
    key_ideas = "\n".join(f"- {k}" for k in ai.get("key_ideas", []))
    pro_args  = "\n".join(f"- {a}" for a in (ai.get("arguments") or {}).get("pro", []))
    con_args  = "\n".join(f"- {a}" for a in (ai.get("arguments") or {}).get("con", []))

    # Use expunere as primary OCR context
    ocr_text = (ocr.get("expunere_de_motive") or "")[:_MAX_OCR_CHARS]

    context = QA_USER.format(
        title     = bill.get("title", bill.get("bill_number", "")),
        key_ideas = key_ideas or "Rezumatul nu este disponibil.",
        pro_args  = pro_args  or "—",
        con_args  = con_args  or "—",
        ocr_text  = ocr_text  or "Textul legii nu este disponibil.",
        question  = state["question"],
    )
    return {"context": context, "error": None}


def classify_intent(state: QAState) -> dict:
    if state.get("error"):
        return {}
    q = state["question"].lower()
    for intent, keywords in _INTENT_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            return {"intent": intent}
    return {"intent": "general"}


def answer(state: QAState) -> dict:
    if state.get("error"):
        return {"answer": "Ne pare rău, a apărut o eroare la procesarea întrebării."}
    try:
        client = _mistral()
        resp = client.chat.complete(
            model=_MODEL,
            messages=[
                {"role": "system", "content": QA_SYSTEM},
                {"role": "user",   "content": state["context"]},
            ],
            temperature=0.3,
            max_tokens=400,
        )
        return {"answer": resp.choices[0].message.content.strip()}
    except Exception as exc:
        return {"answer": f"Eroare: {exc}", "error": str(exc)}


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_qa() -> Any:
    g = StateGraph(QAState)
    g.add_node("load_context",     load_context)
    g.add_node("classify_intent",  classify_intent)
    g.add_node("answer",           answer)

    g.set_entry_point("load_context")
    g.add_edge("load_context",    "classify_intent")
    g.add_edge("classify_intent", "answer")
    g.add_edge("answer",          END)

    return g.compile()


def run_qa(bill: dict, question: str) -> str:
    """
    bill     — full bill dict (already loaded from JSON)
    question — plain Romanian question from citizen
    Returns  — plain Romanian answer string
    """
    graph = build_qa()
    initial: QAState = {
        "bill":     bill,
        "question": question,
        "context":  "",
        "intent":   "",
        "answer":   "",
        "error":    None,
    }
    result = graph.invoke(initial)
    return result.get("answer", "")
