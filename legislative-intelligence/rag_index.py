"""
Build and upload RAG embeddings for Romanian legislation.

Examples:
    python rag_index.py --source bills --all --dry-run
    python rag_index.py --source bills --file bill_23048.json
    python rag_index.py --source legislatie-just --year 2025 --limit 100
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import io
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

from mistralai.client import Mistral
from supabase import Client, create_client

from env_setup import load_project_env
from scraper.legislatie_just import LegislativeAct, LegislatieJustClient

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

load_project_env()

RAW_DIR = Path("data/raw")
EMBED_MODEL = "mistral-embed"
EMBED_DIMENSIONS = 1024
MAX_CHARS = 4_800
OVERLAP_CHARS = 600
BATCH_SIZE = 16


@dataclass
class SourceDocument:
    document_id: str
    source: str
    document_type: str
    content: str
    source_url: Optional[str] = None
    external_id: Optional[str] = None
    bill_idp: Optional[int] = None
    bill_number: Optional[str] = None
    title: Optional[str] = None
    publication: Optional[str] = None
    issuer: Optional[str] = None
    effective_date: Optional[str] = None
    metadata: Optional[dict] = None


@dataclass
class Chunk:
    chunk_id: str
    document_id: str
    source: str
    external_id: Optional[str]
    bill_idp: Optional[int]
    chunk_index: int
    content: str
    content_hash: str
    metadata: dict


def _supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(url, key)


def _mistral() -> Mistral:
    key = os.getenv("MISTRAL_API_KEY")
    if not key:
        raise RuntimeError("MISTRAL_API_KEY must be set in .env")
    return Mistral(api_key=key)


def _sha256(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def _normalize_text(text: str) -> str:
    text = (text or "").replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _chunk_text(text: str, *, max_chars: int = MAX_CHARS, overlap: int = OVERLAP_CHARS) -> list[str]:
    text = _normalize_text(text)
    if not text:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n|(?=\bArticolul\s+\d+\b)", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if len(paragraph) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            for start in range(0, len(paragraph), max_chars - overlap):
                part = paragraph[start:start + max_chars].strip()
                if part:
                    chunks.append(part)
            continue

        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current.strip())
            tail = current[-overlap:].strip() if current and overlap else ""
            current = f"{tail}\n\n{paragraph}".strip() if tail else paragraph

    if current:
        chunks.append(current.strip())

    return chunks


def _metadata_prefix(doc: SourceDocument) -> str:
    parts = [
        doc.bill_number,
        doc.title,
        doc.document_type,
        doc.issuer,
        doc.publication,
        doc.effective_date,
    ]
    return " | ".join(str(p) for p in parts if p)


def _to_chunks(doc: SourceDocument) -> tuple[dict, list[Chunk]]:
    content_hash = _sha256(doc.content)
    metadata = doc.metadata or {}
    document_row = {
        "document_id": doc.document_id,
        "source": doc.source,
        "external_id": doc.external_id,
        "bill_idp": doc.bill_idp,
        "bill_number": doc.bill_number,
        "title": doc.title,
        "document_type": doc.document_type,
        "source_url": doc.source_url,
        "publication": doc.publication,
        "issuer": doc.issuer,
        "effective_date": doc.effective_date,
        "content_hash": content_hash,
        "metadata": metadata,
    }

    prefix = _metadata_prefix(doc)
    chunks = []
    for idx, chunk_text in enumerate(_chunk_text(doc.content)):
        content = f"{prefix}\n\n{chunk_text}".strip() if prefix else chunk_text
        chunk_hash = _sha256(content)
        chunks.append(
            Chunk(
                chunk_id=f"{doc.document_id}:{idx}:{chunk_hash[:12]}",
                document_id=doc.document_id,
                source=doc.source,
                external_id=doc.external_id,
                bill_idp=doc.bill_idp,
                chunk_index=idx,
                content=content,
                content_hash=chunk_hash,
                metadata={**metadata, "chunk_index": idx},
            )
        )
    return document_row, chunks


def _bill_documents(path: Path) -> list[SourceDocument]:
    bill = json.loads(path.read_text(encoding="utf-8"))
    ai = bill.get("ai_analysis") or {}
    docs = bill.get("documents") or {}
    ocr = bill.get("ocr_content") or {}
    metadata = {
        "source_kind": "parliamentary_bill",
        "status": bill.get("status"),
        "initiator": bill.get("initiator"),
        "impact_categories": ai.get("impact_categories", []),
        "affected_profiles": ai.get("affected_profiles", []),
        "title_short": ai.get("title_short"),
    }

    result = []
    for document_type, text in ocr.items():
        if not text:
            continue
        result.append(
            SourceDocument(
                document_id=f"cdep:{bill['idp']}:{document_type}",
                source="cdep",
                external_id=str(bill["idp"]),
                bill_idp=int(bill["idp"]),
                bill_number=bill.get("bill_number"),
                title=bill.get("title"),
                document_type=document_type,
                source_url=docs.get(document_type) or bill.get("source_url"),
                content=text,
                metadata=metadata,
            )
        )
    return result


def _act_document(act: LegislativeAct) -> SourceDocument:
    return SourceDocument(
        document_id=f"legislatie-just:{act.document_id}",
        source="legislatie-just",
        external_id=act.document_id,
        document_type=act.tip_act or "act_normativ",
        source_url=act.link_html,
        title=act.titlu,
        publication=act.publicatie,
        issuer=act.emitent,
        effective_date=act.data_vigoare or None,
        content=act.text,
        metadata={
            "source_kind": "national_legislation",
            "numar": act.numar,
            "tip_act": act.tip_act,
        },
    )


def _embed_texts(texts: list[str]) -> list[list[float]]:
    client = _mistral()
    response = client.embeddings.create(model=EMBED_MODEL, inputs=texts)
    vectors = [item.embedding for item in response.data]
    for vector in vectors:
        if len(vector) != EMBED_DIMENSIONS:
            raise RuntimeError(f"Expected {EMBED_DIMENSIONS} embedding dimensions, got {len(vector)}")
    return vectors


def _embed_texts_resilient(texts: list[str], attempt: int = 0) -> list[list[float]]:
    if not texts:
        return []
    try:
        return _embed_texts(texts)
    except Exception as exc:
        message = str(exc)
        if len(texts) == 1:
            if "service_tier_capacity_exceeded" in message and attempt < 6:
                delay = min(60, 5 * (2 ** attempt))
                print(f"    Capacity retry in {delay}s for single embedding request")
                time.sleep(delay)
                return _embed_texts_resilient(texts, attempt=attempt + 1)
            raise
        if "Too many tokens overall" in message:
            midpoint = len(texts) // 2
            left = _embed_texts_resilient(texts[:midpoint], attempt=attempt)
            right = _embed_texts_resilient(texts[midpoint:], attempt=attempt)
            return left + right
        if "service_tier_capacity_exceeded" in message and attempt < 6:
            delay = min(60, 5 * (2 ** attempt))
            print(f"    Capacity retry in {delay}s for batch of {len(texts)}")
            time.sleep(delay)
            return _embed_texts_resilient(texts, attempt=attempt + 1)
        raise


def _filter_changed(db: Client, documents: list[dict], chunks: list[Chunk]) -> tuple[list[dict], list[Chunk]]:
    if not documents:
        return documents, chunks

    changed_docs: list[dict] = []
    changed_ids: set[str] = set()
    for doc in documents:
        existing = (
            db.table("legislation_documents")
            .select("document_id,content_hash")
            .eq("document_id", doc["document_id"])
            .limit(1)
            .execute()
            .data
        )
        if existing and existing[0].get("content_hash") == doc["content_hash"]:
            chunk_probe = (
                db.table("legislation_chunks")
                .select("chunk_id")
                .eq("document_id", doc["document_id"])
                .limit(1)
                .execute()
                .data
            )
            if chunk_probe:
                continue
        changed_docs.append(doc)
        changed_ids.add(doc["document_id"])

    return changed_docs, [chunk for chunk in chunks if chunk.document_id in changed_ids]


def _upload(db: Client, documents: list[dict], chunks: list[Chunk], dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY RUN] Would upload {len(documents)} documents and {len(chunks)} chunks")
        return

    for doc in documents:
        db.table("legislation_chunks").delete().eq("document_id", doc["document_id"]).execute()
        db.table("legislation_documents").upsert(doc, on_conflict="document_id").execute()

    if not chunks:
        return

    embeddings: list[list[float]] = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        print(f"  Embedding chunks {i + 1}-{i + len(batch)} / {len(chunks)}")
        embeddings.extend(_embed_texts_resilient([chunk.content for chunk in batch]))

    rows = [
        {
            "chunk_id": chunk.chunk_id,
            "document_id": chunk.document_id,
            "source": chunk.source,
            "external_id": chunk.external_id,
            "bill_idp": chunk.bill_idp,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "content_hash": chunk.content_hash,
            "embedding": embedding,
            "metadata": chunk.metadata,
        }
        for chunk, embedding in zip(chunks, embeddings)
    ]

    for i in range(0, len(rows), 100):
        db.table("legislation_chunks").upsert(rows[i:i + 100], on_conflict="chunk_id").execute()


def _iter_bill_docs(args: argparse.Namespace) -> Iterable[SourceDocument]:
    if args.file:
        yield from _bill_documents(RAW_DIR / args.file)
        return

    files = sorted(RAW_DIR.glob("bill_*.json"))
    if args.limit:
        files = files[:args.limit]
    for path in files:
        yield from _bill_documents(path)


def _iter_legislatie_just_docs(args: argparse.Namespace) -> Iterable[SourceDocument]:
    client = LegislatieJustClient()
    years = [args.year] if args.year else range(args.from_year, args.to_year + 1)
    emitted = 0
    seen: set[str] = set()

    for year in years:
        print(f"[LEGISLATIE.JUST] Discovering year {year}")
        for act in client.iter_year(int(year), page_size=args.page_size, max_pages=args.max_pages):
            if act.document_id in seen:
                continue
            seen.add(act.document_id)
            if not act.text:
                continue
            yield _act_document(act)
            emitted += 1
            if args.limit and emitted >= args.limit:
                return


def build_documents(args: argparse.Namespace) -> list[SourceDocument]:
    if args.source == "bills":
        return list(_iter_bill_docs(args))
    if args.source == "legislatie-just":
        return list(_iter_legislatie_just_docs(args))
    raise ValueError(f"Unknown source: {args.source}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Index legislation into Supabase pgvector")
    parser.add_argument("--source", choices=["bills", "legislatie-just"], default="bills")
    parser.add_argument("--all", action="store_true", help="Index all local bills for --source bills")
    parser.add_argument("--file", help="Single data/raw bill filename for --source bills")
    parser.add_argument("--year", type=int, help="Single year for --source legislatie-just")
    parser.add_argument("--from-year", type=int, default=1989)
    parser.add_argument("--to-year", type=int, default=2026)
    parser.add_argument("--page-size", type=int, default=50)
    parser.add_argument("--max-pages", type=int)
    parser.add_argument("--limit", type=int, help="Limit source documents for test runs")
    parser.add_argument("--changed-only", action="store_true", help="Skip documents whose content_hash is unchanged")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.source == "bills" and not args.all and not args.file:
        parser.error("--source bills requires --all or --file")
    if args.source == "legislatie-just" and args.from_year > args.to_year:
        parser.error("--from-year must be <= --to-year")

    docs = build_documents(args)
    document_rows: list[dict] = []
    chunks: list[Chunk] = []
    for doc in docs:
        row, doc_chunks = _to_chunks(doc)
        document_rows.append(row)
        chunks.extend(doc_chunks)

    print(f"Prepared {len(document_rows)} documents and {len(chunks)} chunks")
    if not document_rows:
        return

    db = _supabase() if not args.dry_run else None
    if args.changed_only and db:
        before_docs = len(document_rows)
        document_rows, chunks = _filter_changed(db, document_rows, chunks)
        print(f"Changed-only: {len(document_rows)} / {before_docs} documents need reindexing")

    _upload(db, document_rows, chunks, args.dry_run)  # type: ignore[arg-type]
    print("Done.")


if __name__ == "__main__":
    main()
