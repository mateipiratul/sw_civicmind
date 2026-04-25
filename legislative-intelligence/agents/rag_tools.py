"""
Tools/helpers for legislative RAG.

These functions now go a bit beyond "thin wrappers": they handle local bill
context lookup, cross-bill similarity search, light dedupe/diversity for
retrieval, and query logging for evaluation.
"""
from __future__ import annotations

import json
import os
import re
import time
import unicodedata
from pathlib import Path
from typing import Optional

from mistralai.client import Mistral
from supabase import Client, create_client

from env_setup import load_project_env

load_project_env()

EMBED_MODEL = "mistral-embed"
RAW_DIR = Path("data/raw")
ROMANIAN_STOPWORDS = {
    "a", "ai", "al", "ale", "am", "ar", "asupra", "au", "ca", "care",
    "cat", "ce", "cei", "cele", "celor", "cu", "cum", "cui", "de", "din",
    "doar", "dupa", "este", "fi", "fie", "fost", "fara", "i", "ii", "in",
    "insa", "la", "le", "lor", "lui", "mai", "mi", "nici", "nu", "o", "or",
    "ori", "pe", "pentru", "peste", "prin", "s", "sa", "sau", "se", "si",
    "sunt", "sub", "un", "unei", "unor", "unui", "va",
}


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(url, key)


def embed_query(query: str) -> list[float]:
    key = os.getenv("MISTRAL_API_KEY")
    if not key:
        raise RuntimeError("MISTRAL_API_KEY must be set in .env")
    client = Mistral(api_key=key)
    delays = [0, 3, 7]
    last_exc: Exception | None = None
    for delay in delays:
        if delay:
            time.sleep(delay)
        try:
            response = client.embeddings.create(model=EMBED_MODEL, inputs=[query])
            return response.data[0].embedding
        except Exception as exc:
            message = str(exc).casefold()
            is_retryable = (
                "service_tier_capacity_exceeded" in message
                or "status 429" in message
                or "rate limit" in message
            )
            if not is_retryable:
                raise
            last_exc = exc
    assert last_exc is not None
    raise last_exc


def _load_bill(idp: int) -> Optional[dict]:
    path = RAW_DIR / f"bill_{idp}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value or "")
    without_marks = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return without_marks.casefold()


def _tokenize(value: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9]{2,}", _normalize_text(value))
    return {token for token in tokens if token not in ROMANIAN_STOPWORDS}


def get_bill_context(idp: int) -> dict:
    bill = _load_bill(idp)
    if not bill:
        raise ValueError(f"Bill {idp} not found in data/raw")

    ai = bill.get("ai_analysis") or {}
    ocr = bill.get("ocr_content") or {}
    sessions = bill.get("vote_sessions") or []
    latest_vote = sessions[-1] if sessions else {}
    return {
        "idp": bill["idp"],
        "bill_number": bill.get("bill_number"),
        "title": bill.get("title"),
        "status": bill.get("status"),
        "title_short": ai.get("title_short"),
        "key_ideas": ai.get("key_ideas", []),
        "impact_categories": ai.get("impact_categories", []),
        "affected_profiles": ai.get("affected_profiles", []),
        "arguments": ai.get("arguments", {"pro": [], "con": []}),
        "source_url": bill.get("source_url"),
        "documents": bill.get("documents", {}),
        "ocr_preview": {
            key: (value or "")[:800]
            for key, value in ocr.items()
            if value
        },
        "latest_vote": {
            "idv": latest_vote.get("idv"),
            "date": latest_vote.get("date"),
            "summary": latest_vote.get("summary", {}),
        },
    }


def get_document_by_id(document_id: str) -> dict:
    db = get_supabase()
    rows = (
        db.table("legislation_documents")
        .select("*")
        .eq("document_id", document_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise ValueError(f"Document {document_id} not found")
    return rows[0]


def get_chunk_by_id(chunk_id: str) -> dict:
    db = get_supabase()
    rows = (
        db.table("legislation_chunks")
        .select("*")
        .eq("chunk_id", chunk_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise ValueError(f"Chunk {chunk_id} not found")

    chunk = rows[0]
    document = get_document_by_id(chunk["document_id"])
    return {
        **chunk,
        "document": document,
    }


def _split_sentences(text: str) -> list[str]:
    raw_parts = re.split(r"(?<=[\.\!\?;])\s+|\n+", text or "")
    return [part.strip() for part in raw_parts if part and part.strip()]


def _sentence_match_info(sentence: str, query_tokens: set[str]) -> dict:
    sentence_tokens = _tokenize(sentence)
    overlap_tokens = sorted(query_tokens & sentence_tokens)
    overlap = (
        len(overlap_tokens) / len(query_tokens)
        if query_tokens else 0.0
    )
    return {
        "sentence": sentence.strip(),
        "overlap": round(overlap, 4),
        "matched_terms": overlap_tokens,
    }


def get_chunk_excerpt(
    chunk_id: str,
    *,
    query: Optional[str] = None,
    max_sentences: int = 3,
    max_chars: int = 1200,
) -> dict:
    chunk = get_chunk_by_id(chunk_id)
    sentences = _split_sentences(str(chunk.get("content") or ""))
    query_tokens = _tokenize(query or "")

    if query_tokens:
        ranked = [
            {
                **_sentence_match_info(sentence, query_tokens),
                "index": index,
            }
            for index, sentence in enumerate(sentences)
        ]
        ranked = [item for item in ranked if item["matched_terms"]]
        ranked = sorted(
            ranked,
            key=lambda item: (item["overlap"], -item["index"]),
            reverse=True,
        )[:max(1, max_sentences)]
        selected = sorted(ranked, key=lambda item: item["index"])
    else:
        selected = [
            {
                "index": index,
                "sentence": sentence,
                "overlap": 0.0,
                "matched_terms": [],
            }
            for index, sentence in enumerate(sentences[:max(1, max_sentences)])
        ]

    excerpt = " ".join(item["sentence"] for item in selected).strip()
    if len(excerpt) > max_chars:
        excerpt = excerpt[:max_chars].rstrip() + "..."

    document = chunk["document"]
    return {
        "chunk_id": chunk["chunk_id"],
        "document_id": chunk["document_id"],
        "query": query,
        "title": document.get("title"),
        "document_type": document.get("document_type"),
        "source": chunk.get("source"),
        "source_url": document.get("source_url"),
        "excerpt": excerpt,
        "selected_sentences": selected,
    }


def _search_legislation_chunks_raw(
    query: str,
    *,
    top_k: int = 8,
    threshold: float = 0.72,
    source: Optional[str] = None,
    bill_idp: Optional[int] = None,
    document_type: Optional[str] = None,
    exclude_bill_idp: Optional[int] = None,
) -> list[dict]:
    embedding = embed_query(query)
    db = get_supabase()
    result = db.rpc(
        "match_legislation_chunks",
        {
            "query_embedding": embedding,
            "match_threshold": threshold,
            "match_count": max(top_k * 4, top_k),
            "filter_source": source,
            "filter_bill_idp": bill_idp,
            "filter_document_type": document_type,
            "exclude_bill_idp": exclude_bill_idp,
        },
    ).execute()
    return result.data or []


def _hybrid_rerank_chunks(query: str, rows: list[dict]) -> list[dict]:
    query_tokens = _tokenize(query)
    reranked: list[dict] = []

    for row in rows:
        content = str(row.get("content") or "")
        title = str(row.get("title") or row.get("metadata", {}).get("title") or "")
        vector_similarity = float(row.get("similarity") or 0.0)
        content_tokens = _tokenize(content[:2000])
        title_tokens = _tokenize(title)
        lexical_overlap = (
            len(query_tokens & content_tokens) / len(query_tokens)
            if query_tokens else 0.0
        )
        title_overlap = (
            len(query_tokens & title_tokens) / len(query_tokens)
            if query_tokens else 0.0
        )
        hybrid_score = (
            vector_similarity * 0.82
            + lexical_overlap * 0.12
            + title_overlap * 0.06
        )
        reranked.append(
            {
                **row,
                "vector_similarity": round(vector_similarity, 4),
                "lexical_overlap": round(lexical_overlap, 4),
                "title_overlap": round(title_overlap, 4),
                "score": round(hybrid_score, 4),
            }
        )

    return sorted(
        reranked,
        key=lambda row: (
            float(row.get("score") or 0.0),
            float(row.get("similarity") or 0.0),
        ),
        reverse=True,
    )


def _diversify_chunks(rows: list[dict], top_k: int) -> list[dict]:
    """
    Keep search results useful for UI/agent use:
    - avoid duplicate chunks from the same document dominating the list
    - lightly diversify by bill/document family
    """
    picked: list[dict] = []
    source_first_pass: list[dict] = []
    seen_document_ids: set[str] = set()
    seen_title_roots: set[str] = set()
    seen_sources: set[str] = set()
    bill_counts: dict[str, int] = {}

    for row in rows:
        document_id = str(row.get("document_id") or "")
        bill_key = str(row.get("bill_idp") if row.get("bill_idp") is not None else row.get("external_id") or document_id)
        title = str(row.get("title") or "")
        title_root = title.casefold()[:80]
        source = str(row.get("source") or "")

        if document_id in seen_document_ids:
            continue
        if title_root and title_root in seen_title_roots and bill_counts.get(bill_key, 0) >= 1:
            continue
        if bill_counts.get(bill_key, 0) >= 2:
            continue

        target = picked
        if source and source not in seen_sources and len(source_first_pass) < top_k:
            target = source_first_pass

        target.append(row)
        seen_document_ids.add(document_id)
        if title_root:
            seen_title_roots.add(title_root)
        bill_counts[bill_key] = bill_counts.get(bill_key, 0) + 1
        if source:
            seen_sources.add(source)

        if len(source_first_pass) + len(picked) >= top_k:
            break

    ordered = source_first_pass + picked
    return ordered[:top_k]


def infer_rag_source(question: str, explicit_source: Optional[str] = None) -> Optional[str]:
    if explicit_source:
        return explicit_source

    lower = (question or "").casefold()
    cdep_markers = ["pl-x", "proiect de lege", "camera deputatilor", "deputati", "parlamentari", "vot final"]
    national_markers = ["ordin", "hotarare", "lege nr", "ordonanta", "oug", "monitorul oficial", "ministerul"]

    has_cdep = any(marker in lower for marker in cdep_markers)
    has_national = any(marker in lower for marker in national_markers)

    if has_cdep and not has_national:
        return "cdep"
    if has_national and not has_cdep:
        return "legislatie-just"
    return None


def _log_rag_query(
    query: str,
    *,
    filters: dict,
    results: list[dict],
    model: str = EMBED_MODEL,
) -> None:
    try:
        db = get_supabase()
        db.table("rag_query_logs").insert(
            {
                "query": query,
                "filters": filters,
                "result_chunk_ids": [row.get("chunk_id") for row in results],
                "result_scores": [row.get("similarity") for row in results],
                "model": model,
            }
        ).execute()
    except Exception:
        # Query logging must not break retrieval.
        return


def search_legislation_chunks(
    query: str,
    *,
    top_k: int = 8,
    threshold: float = 0.72,
    source: Optional[str] = None,
    bill_idp: Optional[int] = None,
    document_type: Optional[str] = None,
    exclude_bill_idp: Optional[int] = None,
) -> list[dict]:
    raw = _search_legislation_chunks_raw(
        query,
        top_k=top_k,
        threshold=threshold,
        source=source,
        bill_idp=bill_idp,
        document_type=document_type,
        exclude_bill_idp=exclude_bill_idp,
    )
    reranked = _hybrid_rerank_chunks(query, raw)
    results = _diversify_chunks(reranked, top_k=top_k)
    _log_rag_query(
        query,
        filters={
            "top_k": top_k,
            "threshold": threshold,
            "source": source,
            "bill_idp": bill_idp,
            "document_type": document_type,
            "exclude_bill_idp": exclude_bill_idp,
            "ranking": "hybrid_vector_lexical_v1",
        },
        results=results,
    )
    return results


def explain_chunk_match(
    query: str,
    chunk_id: str,
    *,
    source: Optional[str] = None,
    bill_idp: Optional[int] = None,
    document_type: Optional[str] = None,
    exclude_bill_idp: Optional[int] = None,
) -> dict:
    if not query.strip():
        raise ValueError("query cannot be empty")

    chunk = get_chunk_by_id(chunk_id)
    document = chunk["document"]
    query_tokens = _tokenize(query)
    title = str(document.get("title") or "")
    content = str(chunk.get("content") or "")
    title_tokens = _tokenize(title)
    content_tokens = _tokenize(content[:4000])

    raw_rows = _search_legislation_chunks_raw(
        query,
        top_k=30,
        threshold=0.0,
        source=source,
        bill_idp=bill_idp,
        document_type=document_type,
        exclude_bill_idp=exclude_bill_idp,
    )
    reranked_rows = _hybrid_rerank_chunks(query, raw_rows)
    matched_row = next((row for row in reranked_rows if row.get("chunk_id") == chunk_id), None)

    title_matches = sorted(query_tokens & title_tokens)
    content_matches = sorted(query_tokens & content_tokens)
    excerpt = get_chunk_excerpt(chunk_id, query=query, max_sentences=3, max_chars=900)

    return {
        "query": query,
        "chunk_id": chunk_id,
        "document_id": chunk["document_id"],
        "title": document.get("title"),
        "document_type": document.get("document_type"),
        "source": chunk.get("source"),
        "source_url": document.get("source_url"),
        "matched_in_search": matched_row is not None,
        "vector_similarity": matched_row.get("vector_similarity") if matched_row else None,
        "hybrid_score": matched_row.get("score") if matched_row else None,
        "rank_position": (
            next(index for index, row in enumerate(reranked_rows, start=1) if row.get("chunk_id") == chunk_id)
            if matched_row is not None else None
        ),
        "title_matches": title_matches,
        "content_matches": content_matches[:20],
        "lexical_overlap": round(
            len(content_matches) / len(query_tokens) if query_tokens else 0.0,
            4,
        ),
        "title_overlap": round(
            len(title_matches) / len(query_tokens) if query_tokens else 0.0,
            4,
        ),
        "excerpt": excerpt,
    }


def compare_bill_to_corpus(
    idp: int,
    *,
    top_k: int = 8,
    threshold: float = 0.72,
    source: Optional[str] = None,
) -> dict:
    bill = _load_bill(idp)
    if not bill:
        raise ValueError(f"Bill {idp} not found in data/raw")

    ai = bill.get("ai_analysis") or {}
    ocr = bill.get("ocr_content") or {}
    query_parts = [
        bill.get("bill_number", ""),
        bill.get("title", ""),
        ai.get("title_short", ""),
        " ".join(ai.get("key_ideas", [])[:5]),
        " ".join(ai.get("impact_categories", [])[:5]),
        " ".join(ai.get("affected_profiles", [])[:5]),
        (ocr.get("expunere_de_motive") or "")[:2000],
    ]
    query = "\n".join(part for part in query_parts if part).strip()
    if not query:
        raise ValueError(f"Bill {idp} does not have enough text to compare")

    results = search_legislation_chunks(
        query,
        top_k=top_k,
        threshold=threshold,
        source=source,
        exclude_bill_idp=idp,
    )
    return {
        "bill": {
            "idp": bill["idp"],
            "bill_number": bill.get("bill_number"),
            "title": bill.get("title"),
            "title_short": ai.get("title_short"),
        },
        "items": results,
    }


def rag_health() -> dict:
    db = get_supabase()
    docs = db.table("legislation_documents").select("document_id", count="exact").limit(1).execute()
    chunks = db.table("legislation_chunks").select("chunk_id", count="exact").limit(1).execute()
    latest = (
        db.table("legislation_documents")
        .select("indexed_at,source")
        .order("indexed_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    return {
        "embedding_model": EMBED_MODEL,
        "documents": docs.count,
        "chunks": chunks.count,
        "latest_indexed": latest[0] if latest else None,
    }
