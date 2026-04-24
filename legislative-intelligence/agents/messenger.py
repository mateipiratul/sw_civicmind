"""
Agent 4 — Civic Messenger
Generates a formal Romanian email draft from a citizen to their deputy.

Graph:
  load_context → generate_email → return_draft
"""
import json
import os
from typing import Any

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from mistralai.client import Mistral

from agents.state import MessengerState
from agents.prompts import MESSENGER_SYSTEM, MESSENGER_USER

load_dotenv()

_MODEL = "open-mistral-nemo"   # cheaper model — email writing doesn't need reasoning


def _mistral() -> Mistral:
    return Mistral(api_key=os.getenv("MISTRAL_API_KEY"))


# ── Nodes ─────────────────────────────────────────────────────────────────────

def load_context(state: MessengerState) -> dict:
    bill = state["bill"]
    ai   = bill.get("ai_analysis") or {}
    return {"error": None} if ai else {"error": "Bill has no ai_analysis yet. Run Scout first."}


def generate_email(state: MessengerState) -> dict:
    if state.get("error"):
        return {}

    bill  = state["bill"]
    ai    = bill.get("ai_analysis") or {}
    stance = state["user_stance"]

    key_ideas_text = "\n".join(
        f"{i+1}. {idea}" for i, idea in enumerate(ai.get("key_ideas", []))
    )

    # Build prompt — resolve stance text inline since f-string in prompts.py
    # has a conditional that needs to be rendered here
    stance_ro  = "SUSȚINE" if stance == "support" else "SE OPUNE"
    user_name  = state["user_name"]
    mp_name    = state["mp_name"]
    bill_title = bill.get("title", bill.get("bill_number", ""))
    schema = '{"subject": "Subiectul emailului, max 12 cuvinte", "body": "Corpul emailului complet, 3-4 paragrafe, include salut si semnatura cu ' + user_name + '"}'
    prompt = (
        f"Redacteaza un email formal din partea unui cetatean catre deputatul sau.\n\n"
        f"CETATEAN: {user_name}\n"
        f"DEPUTAT: {mp_name}\n"
        f"POZITIE CETATEAN: cetateanul {stance_ro} acestei legi\n"
        f"LEGE: {bill_title}\n"
        f"IDEI CHEIE:\n{key_ideas_text}\n\n"
        f"SCHEMA OBLIGATORIE:\n{schema}"
    )

    try:
        client = _mistral()
        resp = client.chat.complete(
            model=_MODEL,
            messages=[
                {"role": "system", "content": MESSENGER_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        draft = json.loads(resp.choices[0].message.content)
        return {"email_draft": draft}
    except Exception as exc:
        return {"error": f"generate_email failed: {exc}"}


def return_draft(state: MessengerState) -> dict:
    if state.get("error"):
        print(f"  [MESSENGER ERROR] {state['error']}")
        return {"email_draft": {"subject": "", "body": ""}}
    draft = state.get("email_draft", {})
    print(f"  [MESSENGER OK] Subject: {draft.get('subject', '')}")
    return {}


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_messenger() -> Any:
    g = StateGraph(MessengerState)
    g.add_node("load_context",   load_context)
    g.add_node("generate_email", generate_email)
    g.add_node("return_draft",   return_draft)

    g.set_entry_point("load_context")
    g.add_edge("load_context",   "generate_email")
    g.add_edge("generate_email", "return_draft")
    g.add_edge("return_draft",   END)

    return g.compile()


def run_messenger(
    bill: dict,
    mp_name: str,
    user_name: str,
    user_stance: str,   # 'support' | 'oppose'
) -> dict:
    """
    Returns {"subject": "...", "body": "..."} — the email draft.
    The frontend shows this to the user before sending.
    """
    graph = build_messenger()
    initial: MessengerState = {
        "bill":        bill,
        "mp_name":     mp_name,
        "user_name":   user_name,
        "user_stance": user_stance,
        "email_draft": {},
        "error":       None,
    }
    result = graph.invoke(initial)
    return result.get("email_draft", {})
