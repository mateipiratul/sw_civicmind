"""
Agent 3 — Civic Q&A
Takes a bill (dict or path) + a citizen's question, returns a plain-Romanian answer.

Graph:
  load_context → classify_intent → answer
"""
import json
import os
import logging
import time
import httpx
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from mistralai.client import Mistral

from agents.state import QAState
from agents.prompts import QA_SYSTEM, QA_USER

logger = logging.getLogger(__name__)

_MODEL = "mistral-small-latest"
_MAX_OCR_CHARS = 6_000


from env_setup import get_mistral_api_key, SDKError


def _mistral() -> Mistral:
    return Mistral(api_key=get_mistral_api_key(raise_error=True))


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


def answer(state: QAState) -> dict:
    if state.get("error"):
        return {"answer": "Ne pare rău, a apărut o eroare la procesarea întrebării."}

    _QA_RETRIES = 2
    _QA_RETRY_DELAY = 3

    client = _mistral()
    last_exc = None
    for attempt in range(_QA_RETRIES + 1):
        try:
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
            last_exc = exc
            if attempt < _QA_RETRIES:
                logger.warning(f"answer failed: {exc}. Retrying in {_QA_RETRY_DELAY * (attempt + 1)}s...")
                time.sleep(_QA_RETRY_DELAY * (attempt + 1))
            else:
                return {"answer": f"Eroare: {exc}", "error": str(exc)}


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_qa() -> Any:
    g = StateGraph(QAState)
    g.add_node("load_context",     load_context)
    g.add_node("answer",           answer)

    g.set_entry_point("load_context")
    g.add_edge("load_context",    "answer")
    g.add_edge("answer",          END)

    return g.compile()


_QA_GRAPH = None


def get_qa_graph() -> Any:
    global _QA_GRAPH
    if _QA_GRAPH is None:
        _QA_GRAPH = build_qa()
    return _QA_GRAPH


def run_qa(bill: dict, question: str) -> str:
    """
    bill     — full bill dict (already loaded from JSON)
    question — plain Romanian question from citizen
    Returns  — plain Romanian answer string
    """
    graph = get_qa_graph()
    initial: QAState = {
        "bill":     bill,
        "question": question,
        "context":  "",
        "answer":   "",
        "error":    None,
    }
    result = graph.invoke(initial)
    return result.get("answer", "")
