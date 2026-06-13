"""
Agent 3 — Civic Q&A
Takes a bill (dict or path) + a citizen's question, returns a plain-Romanian answer.

Graph:
  load_context → input_guardrail → (answer OR refusal_fallback)
  answer → output_guardrail → (END or refusal_fallback)
"""
import json
import os
import logging
import time
import httpx
import random
import threading
import re
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from mistralai.client import Mistral

from agents.state import QAState
from agents.prompts import QA_SYSTEM, QA_USER, QA_INPUT_GUARD_SYSTEM, QA_OUTPUT_GUARD_SYSTEM

logger = logging.getLogger(__name__)

_MODEL = "mistral-small-latest"
_MODEL_GUARD = "open-mistral-nemo"
_MAX_OCR_CHARS = 6_000


from env_setup import get_mistral_api_key, SDKError


class ThreadSafeRateLimiter:
    def __init__(self, min_interval_seconds: float = 1.5):
        self.min_interval = min_interval_seconds
        self.last_request_time = 0.0
        self.lock = threading.Lock()

    def wait(self):
        with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.min_interval:
                sleep_needed = self.min_interval - elapsed
                time.sleep(sleep_needed)
            self.last_request_time = time.time()


_RATE_LIMITER = ThreadSafeRateLimiter(min_interval_seconds=1.5)


def _mistral() -> Mistral:
    return Mistral(api_key=get_mistral_api_key(raise_error=True))


# ── Guardrails local rules ───────────────────────────────────────────────────

INJECTION_PATTERNS = [
    r"(?i)ignore\s+(?:all\s+)?previous\s+instructions",
    r"(?i)system\s+prompt",
    r"(?i)forget\s+(?:everything\s+)?you\s+were\s+told",
    r"(?i)uita\s+tot\s+ce\s+ti-am\s+spus",
    r"(?i)ignora\s+instructiunile",
]


def check_local_rules(question: str) -> Optional[str]:
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, question):
            return "Prompt injection pattern detected locally."
    return None


# ── Nodes ─────────────────────────────────────────────────────────────────────

def load_context(state: QAState) -> dict:
    try:
        bill = state["bill"]
        ai   = bill.get("ai_analysis") or {}
        ocr  = bill.get("ocr_content") or {}

        # Build context string
        key_ideas = "\n".join(f"- {k}" for k in ai.get("key_ideas", []))
        
        # Safe extraction of pro/con arguments
        args = ai.get("arguments") or {}
        if not isinstance(args, dict):
            args = {}
        
        pro_args  = "\n".join(f"- {a}" for a in args.get("pro", []))
        con_args  = "\n".join(f"- {a}" for a in args.get("con", []))

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
    except Exception as exc:
        logger.error(f"load_context failed: {exc}")
        return {"context": "", "error": f"Eroare la procesarea contextului legii: {exc}"}


def input_guardrail(state: QAState) -> dict:
    question = state["question"]
    
    # 1. Local Check
    local_violation = check_local_rules(question)
    if local_violation:
        logger.warning(f"Local guardrail flagged: {local_violation}")
        return {
            "guardrail_status": {
                "input_passed": False, 
                "output_passed": True, 
                "flag_reason": local_violation
            }
        }
        
    # 2. LLM Evaluator Check
    client = _mistral()
    try:
        _RATE_LIMITER.wait()
        resp = client.chat.complete(
            model=_MODEL_GUARD,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": QA_INPUT_GUARD_SYSTEM},
                {"role": "user",   "content": f"Întrebare: {question}"}
            ],
            temperature=0.0
        )
        res = json.loads(resp.choices[0].message.content)
        safe = bool(res.get("safe", True))
        reason = res.get("reason", "")
        if not safe:
            logger.warning(f"LLM input guardrail flagged: {reason}")
        return {
            "guardrail_status": {
                "input_passed": safe,
                "output_passed": True,
                "flag_reason": reason
            }
        }
    except Exception as exc:
        logger.error(f"Input guardrail check failed: {exc}")
        return {
            "guardrail_status": {
                "input_passed": True, 
                "output_passed": True, 
                "flag_reason": ""
            }
        }


def answer(state: QAState) -> dict:
    if state.get("error"):
        return {"answer": f"Ne pare rău, a apărut o eroare la procesarea întrebării: {state['error']}"}

    try:
        _QA_RETRIES = 8
        client = _mistral()
        last_exc = None
        
        for attempt in range(_QA_RETRIES):
            _RATE_LIMITER.wait()
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
                message = str(exc).casefold()
                is_retryable = (
                    "rate limit" in message
                    or "status 429" in message
                    or "1300" in message
                    or "rate_limited" in message
                    or "too many requests" in message
                )
                if not is_retryable:
                    return {"answer": f"Eroare la comunicarea cu AI: {exc}", "error": str(exc)}
                
                last_exc = exc
                if attempt < _QA_RETRIES - 1:
                    base_delay = 1.5 * (1.8 ** attempt)
                    sleep_time = base_delay + random.uniform(0.5, 2.5)
                    logger.warning(
                        f"Mistral chat complete (QA) rate limited (attempt {attempt + 1}/{_QA_RETRIES}). "
                        f"Retrying in {sleep_time:.2f}s... Error: {exc}"
                    )
                    time.sleep(sleep_time)
                else:
                    return {"answer": f"Eroare (rate limit depășit): {exc}", "error": str(exc)}
        
        return {"answer": f"Eroare: {last_exc}", "error": str(last_exc)}
    except Exception as exc:
        logger.error(f"answer failed: {exc}")
        return {"answer": f"Eroare generală la procesarea răspunsului: {exc}", "error": str(exc)}


def output_guardrail(state: QAState) -> dict:
    if state.get("error") or not state.get("answer"):
        return {}
        
    answer_text = state["answer"]
    context = state["context"]
    
    client = _mistral()
    try:
        _RATE_LIMITER.wait()
        resp = client.chat.complete(
            model=_MODEL_GUARD,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": QA_OUTPUT_GUARD_SYSTEM},
                {"role": "user",   "content": f"Context:\n{context}\n\nRăspuns:\n{answer_text}"}
            ],
            temperature=0.0
        )
        res = json.loads(resp.choices[0].message.content)
        grounded = bool(res.get("grounded", True))
        reason = res.get("reason", "")
        
        status = state.get("guardrail_status") or {"input_passed": True}
        status["output_passed"] = grounded
        if not grounded:
            logger.warning(f"LLM output guardrail flagged: {reason}")
            status["flag_reason"] = reason or "Răspunsul conține afirmații negrupate în context."
            
        return {"guardrail_status": status}
    except Exception as exc:
        logger.error(f"Output guardrail check failed: {exc}")
        return {}


def refusal_fallback(state: QAState) -> dict:
    reason = (state.get("guardrail_status") or {}).get("flag_reason", "Întrebare sau răspuns necorespunzător.")
    logger.info(f"[QA REFUSAL] Refusing to answer. Reason: {reason}")
    fallback_message = (
        "Ne pare rău, dar nu pot răspunde la această întrebare. Asistentul CivicMind "
        "răspunde exclusiv la întrebări legate de proiectul de lege selectat și de legislația românească, "
        "folosind informații verificate din documentele oficiale."
    )
    return {"answer": fallback_message}


# ── Conditional Routing ───────────────────────────────────────────────────────

def route_after_input(state: QAState) -> str:
    status = state.get("guardrail_status") or {}
    if not status.get("input_passed", True):
        return "refusal_fallback"
    return "answer"


def route_after_output(state: QAState) -> str:
    status = state.get("guardrail_status") or {}
    if not status.get("output_passed", True):
        return "refusal_fallback"
    return END


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_qa() -> Any:
    g = StateGraph(QAState)
    g.add_node("load_context",     load_context)
    g.add_node("input_guardrail",  input_guardrail)
    g.add_node("answer",           answer)
    g.add_node("output_guardrail", output_guardrail)
    g.add_node("refusal_fallback", refusal_fallback)

    g.set_entry_point("load_context")
    g.add_edge("load_context",    "input_guardrail")
    
    g.add_conditional_edges(
        "input_guardrail",
        route_after_input,
        {
            "answer": "answer",
            "refusal_fallback": "refusal_fallback"
        }
    )
    g.add_edge("answer", "output_guardrail")
    
    g.add_conditional_edges(
        "output_guardrail",
        route_after_output,
        {
            "refusal_fallback": "refusal_fallback",
            END: END
        }
    )
    g.add_edge("refusal_fallback", END)

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
        "guardrail_status": None,
    }
    result = graph.invoke(initial)
    return result.get("answer", "")


