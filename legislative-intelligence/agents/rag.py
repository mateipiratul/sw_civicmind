"""
RAG Agent — Legislative Text Similarity Chat.

The production target is a LangGraph prebuilt ReAct chatbot with retrieval
tools. The public `run_rag_chat` function keeps the first API integration
simple and grounded while the frontend is still being wired.
"""
from __future__ import annotations

import os
from typing import Optional

from mistralai.client import Mistral

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
MAX_CONTEXT_CHARS = 12_000

RAG_SYSTEM = """Raspunzi in romana, clar si prudent.
Folosesti exclusiv fragmentele legislative primite in context.
Pentru fiecare afirmatie importanta, mentionezi sursa: numar/titlu act, tip document si link.
Daca fragmentele nu sustin raspunsul, spui ca nu ai gasit o potrivire suficient de puternica.
Nu mentiona, nu sugera si nu ghici acte normative care nu apar explicit in fragmentele primite.
Nu oferi exemple suplimentare din memorie.
Nu oferi consultanta juridica personalizata; explica informativ."""


def _mistral() -> Mistral:
    key = os.getenv("MISTRAL_API_KEY")
    if not key:
        raise RuntimeError("MISTRAL_API_KEY must be set in .env")
    return Mistral(api_key=key)


def _format_context(chunks: list[dict]) -> str:
    parts: list[str] = []
    remaining = MAX_CONTEXT_CHARS
    for idx, chunk in enumerate(chunks, start=1):
        title = chunk.get("title") or chunk.get("metadata", {}).get("title") or "Act legislativ"
        doc_type = chunk.get("document_type") or chunk.get("metadata", {}).get("document_type") or chunk.get("source")
        url = chunk.get("source_url") or ""
        similarity = chunk.get("similarity")
        score = f"{float(similarity):.3f}" if similarity is not None else "n/a"
        header = f"[Sursa {idx}] {title} | {doc_type} | scor={score} | {url}"
        body = chunk.get("content") or ""
        block = f"{header}\n{body}".strip()
        if len(block) > remaining:
            block = block[:remaining]
        parts.append(block)
        remaining -= len(block)
        if remaining <= 0:
            break
    return "\n\n---\n\n".join(parts)


def _looks_like_similarity_request(question: str) -> bool:
    lower = (question or "").casefold()
    markers = [
        "similar",
        "similare",
        "seamana",
        "compar",
        "compare",
        "asemanator",
        "asemanatoare",
        "texte similare",
    ]
    return any(marker in lower for marker in markers)


def run_rag_chat(
    question: str,
    *,
    top_k: int = 8,
    threshold: float = 0.72,
    source: Optional[str] = None,
    bill_idp: Optional[int] = None,
    exclude_bill_idp: Optional[int] = None,
) -> dict:
    resolved_source = infer_rag_source(question, explicit_source=source)
    if bill_idp is not None and _looks_like_similarity_request(question):
        if resolved_source is None:
            resolved_source = "cdep"
        comparison = compare_bill_to_corpus(
            bill_idp,
            top_k=top_k,
            threshold=threshold,
            source=resolved_source,
        )
        chunks = comparison.get("items", [])
    else:
        chunks = search_legislation_chunks(
            question,
            top_k=top_k,
            threshold=threshold,
            source=resolved_source,
            bill_idp=bill_idp,
            exclude_bill_idp=exclude_bill_idp,
        )
    if not chunks:
        return {
            "answer": "Nu am gasit fragmente legislative suficient de similare pentru a raspunde cu incredere.",
            "sources": [],
            "resolved_source": resolved_source,
        }

    top_similarity = max(float(chunk.get("similarity") or 0.0) for chunk in chunks)
    if top_similarity < 0.78:
        return {
            "answer": "Nu am gasit o potrivire legislativa suficient de puternica pentru a raspunde in mod sigur doar pe baza fragmentelor indexate.",
            "sources": chunks,
            "resolved_source": resolved_source,
        }

    context = _format_context(chunks)
    prompt = (
        "Intrebare utilizator:\n"
        f"{question}\n\n"
        "Fragmente legislative recuperate:\n"
        f"{context}\n\n"
        "Raspunde concis, cu citari explicite catre sursele de mai sus."
    )

    response = _mistral().chat.complete(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": RAG_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=700,
    )
    return {
        "answer": response.choices[0].message.content.strip(),
        "sources": chunks,
        "resolved_source": resolved_source,
    }


def build_react_rag_agent():
    """
    Build the planned LangGraph prebuilt ReAct chatbot.

    Requires `langchain-mistralai`. Kept separate from `run_rag_chat` so the
    simpler API endpoint can work while we tune the tool prompts.
    """
    from langchain_core.tools import tool
    from langchain_mistralai import ChatMistralAI
    from langgraph.prebuilt import create_react_agent

    @tool
    def search_legislation(query: str) -> list[dict]:
        """Search Romanian legislation chunks by semantic similarity."""
        return search_legislation_chunks(query, top_k=8, threshold=0.72)

    @tool
    def bill_context(idp: int) -> dict:
        """Get structured context for one local Chamber bill by idp."""
        return get_bill_context(idp)

    @tool
    def compare_bill(idp: int) -> dict:
        """Find similar legislative chunks for a local Chamber bill."""
        return compare_bill_to_corpus(idp, top_k=8, threshold=0.72)

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
