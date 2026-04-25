"""
RAG Agent - Legislative Text Similarity Chat.

This module now exposes two live paths:
- `run_rag_chat()` for a one-shot LangGraph ReAct response
- `stream_rag_chat_events()` for token streaming in the website chat UI
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Optional

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from env_setup import load_project_env
from agents.rag_tools import (
    compare_bill_to_corpus,
    explain_chunk_match,
    get_bill_context,
    get_chunk_by_id,
    get_chunk_excerpt,
    get_document_by_id,
    infer_rag_source,
    search_legislation_chunks,
)

load_project_env()

CHAT_MODEL = "mistral-small-latest"
DEFAULT_TOP_K = 8
DEFAULT_THRESHOLD = 0.72

RAG_SYSTEM = """Raspunzi in romana, clar, verificabil si prudent.
Esti agentul RAG CivicMind pentru legislatie din Romania.
Folosesti numai informatia recuperata prin tool-uri si contextul obtinut din acestea.
Pentru fiecare afirmatie importanta, mentionezi sursa explicita: numar sau titlu act, tip document si link.
Daca nu ai dovezi suficiente in rezultatele recuperate, spui clar ca nu ai gasit o potrivire suficient de puternica.
Nu mentiona, nu sugera si nu ghici acte normative care nu apar explicit in rezultatele tool-urilor.
Nu oferi consultanta juridica personalizata; explica informativ.
Daca intrebarea cere texte similare sau comparatie, folosesti tool-urile de cautare si comparatie, apoi rezumi prudent rezultatele."""


def _compose_agent_prompt(
    question: str,
    *,
    top_k: int,
    threshold: float,
    source: Optional[str],
    bill_idp: Optional[int],
    exclude_bill_idp: Optional[int],
) -> str:
    instructions = [
        "Intrebare utilizator:",
        question.strip(),
        "",
        "Context operational pentru tool-uri:",
        f"- top_k recomandat: {top_k}",
        f"- prag similaritate orientativ: {threshold:.2f}",
    ]
    if source:
        instructions.append(f"- prefera sursa: {source}")
    if bill_idp is not None:
        instructions.append(
            f"- proiect local selectat in UI: idp={bill_idp}; daca utilizatorul cere comparatie sau texte similare fata de acest proiect, foloseste compare_bill(idp={bill_idp}) sau bill_context(idp={bill_idp})"
        )
    if exclude_bill_idp is not None:
        instructions.append(
            f"- exclude proiectul local cu idp={exclude_bill_idp} din potrivirile comparative daca este relevant"
        )
    instructions.append("")
    instructions.append("Raspunde numai dupa ce folosesti tool-urile necesare.")
    return "\n".join(instructions).strip()


def _coerce_json_payload(raw: Any) -> Any:
    if isinstance(raw, (dict, list)):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw
    return raw


def _dedupe_sources(items: list[dict]) -> list[dict]:
    deduped: list[dict] = []
    seen_chunk_ids: set[str] = set()
    for item in items:
        chunk_id = str(item.get("chunk_id") or "")
        if not chunk_id or chunk_id in seen_chunk_ids:
            continue
        seen_chunk_ids.add(chunk_id)
        deduped.append(item)
    return deduped


def _extract_sources_from_payload(payload: Any) -> list[dict]:
    parsed = _coerce_json_payload(payload)
    if isinstance(parsed, list):
        return [item for item in parsed if isinstance(item, dict)]
    if isinstance(parsed, dict) and isinstance(parsed.get("items"), list):
        return [item for item in parsed["items"] if isinstance(item, dict)]
    return []


def _extract_sources_from_messages(messages: list[BaseMessage]) -> list[dict]:
    collected: list[dict] = []
    for message in messages:
        if not isinstance(message, ToolMessage):
            continue
        if message.name not in {"search_legislation", "compare_bill"}:
            continue
        collected.extend(_extract_sources_from_payload(message.content))
    return _dedupe_sources(collected)


def _extract_final_answer(messages: list[BaseMessage]) -> str:
    for message in reversed(messages):
        if not isinstance(message, AIMessage):
            continue
        if message.tool_calls:
            continue
        content = message.content
        if isinstance(content, str) and content.strip():
            return content.strip()
    return ""


async def arun_rag_chat(
    question: str,
    *,
    top_k: int = DEFAULT_TOP_K,
    threshold: float = DEFAULT_THRESHOLD,
    source: Optional[str] = None,
    bill_idp: Optional[int] = None,
    exclude_bill_idp: Optional[int] = None,
) -> dict:
    resolved_source = infer_rag_source(question, explicit_source=source)
    agent = get_react_rag_agent()
    prompt = _compose_agent_prompt(
        question,
        top_k=top_k,
        threshold=threshold,
        source=resolved_source,
        bill_idp=bill_idp,
        exclude_bill_idp=exclude_bill_idp,
    )
    result = await agent.ainvoke({"messages": [{"role": "user", "content": prompt}]})
    messages = result.get("messages", [])
    answer = _extract_final_answer(messages) or "Nu am putut genera un raspuns verificabil din sursele recuperate."
    sources = _extract_sources_from_messages(messages)
    return {
        "answer": answer,
        "sources": sources,
        "resolved_source": resolved_source,
        "agent_mode": "langgraph_react",
    }


def run_rag_chat(
    question: str,
    *,
    top_k: int = DEFAULT_TOP_K,
    threshold: float = DEFAULT_THRESHOLD,
    source: Optional[str] = None,
    bill_idp: Optional[int] = None,
    exclude_bill_idp: Optional[int] = None,
) -> dict:
    return asyncio.run(
        arun_rag_chat(
            question,
            top_k=top_k,
            threshold=threshold,
            source=source,
            bill_idp=bill_idp,
            exclude_bill_idp=exclude_bill_idp,
        )
    )


async def stream_rag_chat_events(
    question: str,
    *,
    top_k: int = DEFAULT_TOP_K,
    threshold: float = DEFAULT_THRESHOLD,
    source: Optional[str] = None,
    bill_idp: Optional[int] = None,
    exclude_bill_idp: Optional[int] = None,
) -> AsyncIterator[dict]:
    resolved_source = infer_rag_source(question, explicit_source=source)
    agent = get_react_rag_agent()
    prompt = _compose_agent_prompt(
        question,
        top_k=top_k,
        threshold=threshold,
        source=resolved_source,
        bill_idp=bill_idp,
        exclude_bill_idp=exclude_bill_idp,
    )

    collected_sources: list[dict] = []
    answer_parts: list[str] = []
    final_answer = ""

    yield {
        "type": "start",
        "agent_mode": "langgraph_react",
        "resolved_source": resolved_source,
    }

    async for mode, payload in agent.astream(
        {"messages": [{"role": "user", "content": prompt}]},
        stream_mode=["messages", "updates"],
    ):
        if mode == "messages":
            message, metadata = payload
            if metadata.get("langgraph_node") != "agent":
                continue
            delta = getattr(message, "content", "")
            if isinstance(delta, str) and delta:
                answer_parts.append(delta)
                yield {"type": "token", "delta": delta}
            continue

        if mode != "updates":
            continue

        if "tools" in payload:
            tool_messages = payload["tools"].get("messages", [])
            newly_found: list[dict] = []
            for tool_message in tool_messages:
                if not isinstance(tool_message, ToolMessage):
                    continue
                newly_found.extend(_extract_sources_from_payload(tool_message.content))
            merged = _dedupe_sources(collected_sources + newly_found)
            if len(merged) != len(collected_sources):
                collected_sources = merged
                yield {"type": "sources", "items": collected_sources}

        if "agent" in payload:
            final_answer = _extract_final_answer(payload["agent"].get("messages", [])) or final_answer

    if not final_answer:
        final_answer = "".join(answer_parts).strip()
    if not final_answer:
        final_answer = "Nu am putut genera un raspuns verificabil din sursele recuperate."

    yield {
        "type": "done",
        "answer": final_answer,
        "sources": collected_sources,
        "resolved_source": resolved_source,
        "agent_mode": "langgraph_react",
    }


def build_react_rag_agent():
    """
    Build the LangGraph prebuilt ReAct chatbot used by the website chat.
    """
    from langchain_core.tools import tool
    from langchain_mistralai import ChatMistralAI
    from langgraph.prebuilt import create_react_agent

    @tool
    def search_legislation(
        query: str,
        source: Optional[str] = None,
        top_k: int = DEFAULT_TOP_K,
        threshold: float = DEFAULT_THRESHOLD,
        bill_idp: Optional[int] = None,
        document_type: Optional[str] = None,
        exclude_bill_idp: Optional[int] = None,
    ) -> list[dict]:
        """Search Romanian legislation chunks by semantic similarity."""
        return search_legislation_chunks(
            query,
            top_k=top_k,
            threshold=threshold,
            source=source,
            bill_idp=bill_idp,
            document_type=document_type,
            exclude_bill_idp=exclude_bill_idp,
        )

    @tool
    def bill_context(idp: int) -> dict:
        """Get structured context for one local Chamber bill by idp."""
        return get_bill_context(idp)

    @tool
    def compare_bill(
        idp: int,
        source: Optional[str] = None,
        top_k: int = DEFAULT_TOP_K,
        threshold: float = DEFAULT_THRESHOLD,
    ) -> dict:
        """Find similar legislative chunks for a local Chamber bill."""
        return compare_bill_to_corpus(idp, top_k=top_k, threshold=threshold, source=source)

    @tool
    def document_detail(document_id: str) -> dict:
        """Fetch one indexed legislation document by document_id."""
        return get_document_by_id(document_id)

    @tool
    def chunk_detail(chunk_id: str) -> dict:
        """Fetch one indexed chunk and its parent document by chunk_id."""
        return get_chunk_by_id(chunk_id)

    @tool
    def chunk_excerpt(chunk_id: str, query: str = "") -> dict:
        """Show the most relevant excerpt inside one indexed chunk."""
        return get_chunk_excerpt(chunk_id, query=query or None, max_sentences=3, max_chars=900)

    @tool
    def explain_match(query: str, chunk_id: str) -> dict:
        """Explain why a given chunk matched a semantic search query."""
        return explain_chunk_match(query, chunk_id)

    model = ChatMistralAI(model=CHAT_MODEL, temperature=0.2)
    return create_react_agent(
        model,
        tools=[
            search_legislation,
            bill_context,
            compare_bill,
            document_detail,
            chunk_detail,
            chunk_excerpt,
            explain_match,
        ],
        prompt=RAG_SYSTEM,
        name="legislative_rag",
    )


def get_react_rag_agent():
    return build_react_rag_agent()
