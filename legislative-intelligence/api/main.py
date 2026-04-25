"""
CivicMind REST API
Reads from data/raw/ and data/processed/ JSON files.
No database required — swap to Supabase queries later.

Run:
    uvicorn api.main:app --reload --port 8001
"""
import json
import subprocess
import sys
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

DATA_RAW       = Path("data/raw")
DATA_PROCESSED = Path("data/processed")

app = FastAPI(
    title="CivicMind API",
    description="Transparency API for Romanian parliamentary bills and MPs",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Data loading ──────────────────────────────────────────────────────────────

def _load_bills() -> list[dict]:
    bills = []
    for path in sorted(DATA_RAW.glob("bill_*.json")):
        bills.append(json.loads(path.read_text(encoding="utf-8")))
    return bills


def _load_impact_scores() -> list[dict]:
    path = DATA_PROCESSED / "impact_scores.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _load_notification_events() -> list[dict]:
    path = DATA_PROCESSED / "bill_events.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _load_bill_flags() -> dict:
    path = DATA_PROCESSED / "bill_flags.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _load_notification_jobs() -> list[dict]:
    path = DATA_PROCESSED / "notification_jobs.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _bills_by_idp() -> dict[int, dict]:
    return {b["idp"]: b for b in _load_bills()}


def _norm(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value or "")
    without_marks = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return without_marks.casefold()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    bills  = list(DATA_RAW.glob("bill_*.json"))
    scores = DATA_PROCESSED / "impact_scores.json"
    return {
        "status": "ok",
        "bills_on_disk": len(bills),
        "impact_scores_ready": scores.exists(),
    }


# ── Bills ─────────────────────────────────────────────────────────────────────

def _bill_summary(bill: dict) -> dict:
    ai = bill.get("ai_analysis") or {}
    sessions = bill.get("vote_sessions", [])
    last_session = sessions[-1] if sessions else {}
    return {
        "idp":               bill["idp"],
        "bill_number":       bill.get("bill_number"),
        "title":             bill.get("title"),
        "title_short":       ai.get("title_short") or bill.get("title", "")[:80],
        "status":            bill.get("status"),
        "impact_categories": ai.get("impact_categories", []),
        "controversy_score": ai.get("controversy_score"),
        "passed_by":         ai.get("passed_by"),
        "dominant_party":    ai.get("dominant_party"),
        "vote_date":         ai.get("vote_date") or last_session.get("date"),
        "has_ai_analysis":   bool(ai),
    }


@app.get("/bills")
def list_bills(
    category: Optional[str] = Query(None, description="Filter by impact category"),
    party:    Optional[str] = Query(None, description="Filter by dominant party"),
    page:     int = Query(1, ge=1),
    size:     int = Query(20, ge=1, le=100),
):
    bills = _load_bills()

    if category:
        bills = [
            b for b in bills
            if category.lower() in [c.lower() for c in (b.get("ai_analysis") or {}).get("impact_categories", [])]
        ]
    if party:
        bills = [
            b for b in bills
            if (b.get("ai_analysis") or {}).get("dominant_party", "").upper() == party.upper()
        ]

    total = len(bills)
    start = (page - 1) * size
    page_bills = bills[start: start + size]

    return {
        "total": total,
        "page":  page,
        "size":  size,
        "items": [_bill_summary(b) for b in page_bills],
    }


@app.get("/bills/{idp}")
def get_bill(idp: int):
    bill = _bills_by_idp().get(idp)
    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill {idp} not found")

    ai = bill.get("ai_analysis") or {}
    sessions = bill.get("vote_sessions", [])

    # Build party breakdown from last vote session
    party_votes = []
    if sessions:
        party_votes = sessions[-1].get("by_party", [])

    return {
        **_bill_summary(bill),
        "initiator":        bill.get("initiator"),
        "registered_at":    bill.get("registered_at"),
        "adopted_at":       bill.get("adopted_at"),
        "documents":        bill.get("documents", {}),
        "key_ideas":        ai.get("key_ideas", []),
        "affected_profiles": ai.get("affected_profiles", []),
        "arguments":        ai.get("arguments", {"pro": [], "con": []}),
        "vote_sessions_count": len(sessions),
        "party_votes":      party_votes,
        "vote_summary":     sessions[-1].get("summary") if sessions else {},
    }


@app.get("/bills/{idp}/votes")
def get_bill_votes(
    idp: int,
    q: Optional[str] = Query(None, description="Substring search by MP name"),
    party: Optional[str] = Query(None, description="Filter by party"),
    vote: Optional[str] = Query(None, description="Filter by vote: for | against | abstain | absent"),
):
    bill = _bills_by_idp().get(idp)
    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill {idp} not found")

    sessions = bill.get("vote_sessions", [])
    if not sessions:
        return {
            "idp": idp,
            "bill_number": bill.get("bill_number"),
            "vote_session": None,
            "total": 0,
            "items": [],
        }

    session = sessions[-1]
    votes = session.get("nominal_votes", [])

    if q:
        needle = _norm(q)
        votes = [mv for mv in votes if needle in _norm(mv.get("mp_name", ""))]
    if party:
        votes = [mv for mv in votes if mv.get("party", "").upper() == party.upper()]
    if vote:
        allowed = {"for", "against", "abstain", "absent"}
        if vote not in allowed:
            raise HTTPException(status_code=422, detail=f"vote must be one of: {', '.join(sorted(allowed))}")
        votes = [mv for mv in votes if mv.get("vote") == vote]

    return {
        "idp": idp,
        "bill_number": bill.get("bill_number"),
        "title_short": (bill.get("ai_analysis") or {}).get("title_short") or bill.get("title", "")[:80],
        "vote_session": {
            "idv": session.get("idv"),
            "type": session.get("type"),
            "date": session.get("date"),
            "time": session.get("time"),
            "description": session.get("description"),
            "summary": session.get("summary", {}),
            "by_party": session.get("by_party", []),
        },
        "total": len(votes),
        "items": votes,
    }


# ── MPs ───────────────────────────────────────────────────────────────────────

@app.get("/mps")
def list_mps(
    party: Optional[str] = Query(None, description="Filter by party"),
    sort:  str           = Query("score", description="Sort field: score | name"),
    page:  int           = Query(1, ge=1),
    size:  int           = Query(50, ge=1, le=200),
):
    scores = _load_impact_scores()

    if party:
        scores = [s for s in scores if s.get("party", "").upper() == party.upper()]

    if sort == "name":
        scores = sorted(scores, key=lambda x: x.get("mp_name", ""))
    else:
        scores = sorted(scores, key=lambda x: x.get("score", 0), reverse=True)

    total = len(scores)
    start = (page - 1) * size
    page_scores = scores[start: start + size]

    return {
        "total": total,
        "page":  page,
        "size":  size,
        "items": [
            {
                "mp_slug":          s["mp_slug"],
                "mp_name":          s["mp_name"],
                "party":            s["party"],
                "score":            s["score"],
                "total_votes":      s["total_votes"],
                "for_count":        s["for_count"],
                "against_count":    s["against_count"],
                "abstain_count":    s["abstain_count"],
                "absent_count":     s["absent_count"],
                "categories_voted": s["categories_voted"],
                "narrative":        s.get("narrative", ""),
            }
            for s in page_scores
        ],
    }


@app.get("/mps/search")
def search_mps(
    q: str = Query(..., min_length=1, description="Substring search by MP name"),
    party: Optional[str] = Query(None, description="Filter by party"),
    size: int = Query(20, ge=1, le=100),
):
    needle = _norm(q)
    scores = _load_impact_scores()

    matches = [
        s for s in scores
        if needle in _norm(s.get("mp_name", ""))
    ]
    if party:
        matches = [s for s in matches if s.get("party", "").upper() == party.upper()]

    matches = sorted(matches, key=lambda x: (-x.get("score", 0), x.get("mp_name", "")))[:size]

    return {
        "q": q,
        "total": len(matches),
        "items": [
            {
                "mp_slug":     s["mp_slug"],
                "mp_name":     s["mp_name"],
                "party":       s["party"],
                "score":       s["score"],
                "total_votes": s["total_votes"],
            }
            for s in matches
        ],
    }


@app.get("/mps/{mp_slug}")
def get_mp(mp_slug: str):
    scores = _load_impact_scores()
    mp = next((s for s in scores if s["mp_slug"] == mp_slug), None)
    if not mp:
        raise HTTPException(status_code=404, detail=f"MP '{mp_slug}' not found")

    # Build vote history by scanning all bills
    vote_history = []
    for bill in _load_bills():
        bill_number = bill.get("bill_number", "")
        ai = bill.get("ai_analysis") or {}
        for session in bill.get("vote_sessions", []):
            for mv in session.get("nominal_votes", []):
                if mv["mp_slug"] == mp_slug:
                    vote_history.append({
                        "idp":         bill["idp"],
                        "bill_number": bill_number,
                        "title_short": ai.get("title_short", bill.get("title", ""))[:80],
                        "vote":        mv["vote"],
                        "date":        session.get("date"),
                        "categories":  ai.get("impact_categories", []),
                    })

    vote_history.sort(key=lambda x: x.get("date") or "", reverse=True)

    return {
        **mp,
        "vote_history": vote_history,
    }


# ── Agent endpoints ───────────────────────────────────────────────────────────

class QARequest(BaseModel):
    idp:      int
    question: str


class MessengerRequest(BaseModel):
    idp:       int
    mp_name:   str
    user_name: str
    stance:    str  # "support" | "oppose"


class NotificationRunRequest(BaseModel):
    preferences_path: Optional[str] = None


class NotificationDeliverRequest(BaseModel):
    limit: int = 100


class RAGSearchRequest(BaseModel):
    query: str
    top_k: int = 8
    threshold: float = 0.72
    source: Optional[str] = None
    bill_idp: Optional[int] = None
    document_type: Optional[str] = None
    exclude_bill_idp: Optional[int] = None


class RAGChatRequest(BaseModel):
    question: str
    top_k: int = 8
    threshold: float = 0.72
    source: Optional[str] = None
    bill_idp: Optional[int] = None
    exclude_bill_idp: Optional[int] = None


class RAGBillCompareRequest(BaseModel):
    idp: int
    top_k: int = 8
    threshold: float = 0.72
    source: Optional[str] = None


class RAGReindexRequest(BaseModel):
    source: str = "legislatie-just"  # bills | legislatie-just
    all: bool = False
    file: Optional[str] = None
    year: Optional[int] = None
    from_year: int = 1989
    to_year: int = 2026
    page_size: int = 50
    max_pages: Optional[int] = None
    limit: Optional[int] = None
    changed_only: bool = True
    dry_run: bool = False


class RAGEvalRequest(BaseModel):
    cases: str = "evals/rag_queries.json"
    limit: Optional[int] = None
    report: str = "data/processed/rag_eval_last.json"


class RAGExplainMatchRequest(BaseModel):
    query: str
    chunk_id: str
    source: Optional[str] = None
    bill_idp: Optional[int] = None
    document_type: Optional[str] = None
    exclude_bill_idp: Optional[int] = None


class UserProfileBody(BaseModel):
    display_name: Optional[str] = None
    auth_provider: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    constituency: Optional[str] = None
    occupation: Optional[str] = None
    sector: Optional[str] = None
    roles: list[str] = []
    interests: list[str] = []
    affected_profiles: list[str] = []
    followed_bills: list[int] = []
    followed_mps: list[str] = []
    language: str = "ro"
    explanation_preference: str = "brief"
    onboarding_completed_at: Optional[str] = None


class NotificationPreferencesBody(BaseModel):
    categories: list[str] = []
    profiles: list[str] = []
    flags: list[str] = []
    frequency: str = "weekly"
    min_importance: str = "normal"
    major_alerts: bool = True


class UserProfileUpsertRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    email_opt_in: Optional[bool] = None
    profile: UserProfileBody
    notification_preferences: Optional[NotificationPreferencesBody] = None


@app.post("/qa")
def ask_question(req: QARequest):
    bill = _bills_by_idp().get(req.idp)
    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill {req.idp} not found")
    if not bill.get("ai_analysis"):
        raise HTTPException(status_code=422, detail="Bill has no AI analysis. Run Scout first.")

    from agents.qa import run_qa
    answer = run_qa(bill, req.question)
    return {"idp": req.idp, "question": req.question, "answer": answer}


@app.post("/messenger")
def draft_email(req: MessengerRequest):
    if req.stance not in ("support", "oppose"):
        raise HTTPException(status_code=422, detail="stance must be 'support' or 'oppose'")

    bill = _bills_by_idp().get(req.idp)
    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill {req.idp} not found")
    if not bill.get("ai_analysis"):
        raise HTTPException(status_code=422, detail="Bill has no AI analysis. Run Scout first.")

    from agents.messenger import run_messenger
    draft = run_messenger(bill, req.mp_name, req.user_name, req.stance)
    return {"idp": req.idp, "draft": draft}


@app.get("/profiles/{user_id}")
def get_profile(user_id: str):
    try:
        from personalization import get_user_profile
        return get_user_profile(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.put("/profiles/{user_id}")
def put_profile(user_id: str, req: UserProfileUpsertRequest):
    try:
        from personalization import upsert_user_profile
        return upsert_user_profile(user_id, req.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/profiles/{user_id}/personalization")
def get_profile_personalization(
    user_id: str,
    limit: int = Query(10, ge=1, le=50),
):
    try:
        from personalization import build_personalization_summary
        return build_personalization_summary(user_id, limit=limit)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/profiles/{user_id}/follow/bill/{idp}")
def follow_bill(user_id: str, idp: int):
    try:
        from personalization import follow_bill as _follow_bill
        return _follow_bill(user_id, idp)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.delete("/profiles/{user_id}/follow/bill/{idp}")
def unfollow_bill(user_id: str, idp: int):
    try:
        from personalization import unfollow_bill as _unfollow_bill
        return _unfollow_bill(user_id, idp)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/profiles/{user_id}/follow/mp/{mp_slug}")
def follow_mp(user_id: str, mp_slug: str):
    try:
        from personalization import follow_mp as _follow_mp
        return _follow_mp(user_id, mp_slug)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.delete("/profiles/{user_id}/follow/mp/{mp_slug}")
def unfollow_mp(user_id: str, mp_slug: str):
    try:
        from personalization import unfollow_mp as _unfollow_mp
        return _unfollow_mp(user_id, mp_slug)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/feed")
def get_feed(
    user_id: Optional[str] = Query(None, description="Omit for anonymous chronological feed"),
    limit: int = Query(20, ge=1, le=50),
    category: Optional[str] = Query(None, description="Filter by impact category"),
):
    try:
        if user_id:
            from personalization import build_personalization_summary
            result = build_personalization_summary(user_id, limit=limit)
            items = result["recommended_bills"]
            if category:
                items = [
                    i for i in items
                    if category.casefold() in [c.casefold() for c in i.get("impact_categories", [])]
                ]
            return {
                "mode": "personalized",
                "user_id": user_id,
                "ranking_strategy": result["feed_guidance"]["ranking_strategy"],
                "total": len(items),
                "items": items,
            }
        else:
            from personalization import build_anonymous_feed
            return build_anonymous_feed(limit=limit, category=category)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/rag/health")
def get_rag_health():
    try:
        from agents.rag_tools import rag_health
        return {"status": "ok", **rag_health()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/rag/search")
def rag_search(req: RAGSearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=422, detail="query cannot be empty")
    try:
        from agents.rag_tools import search_legislation_chunks
        items = search_legislation_chunks(
            req.query,
            top_k=req.top_k,
            threshold=req.threshold,
            source=req.source,
            bill_idp=req.bill_idp,
            document_type=req.document_type,
            exclude_bill_idp=req.exclude_bill_idp,
        )
        return {"query": req.query, "total": len(items), "items": items}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/rag/chat")
async def rag_chat(req: RAGChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=422, detail="question cannot be empty")
    try:
        from agents.rag import arun_rag_chat
        return await arun_rag_chat(
            req.question,
            top_k=req.top_k,
            threshold=req.threshold,
            source=req.source,
            bill_idp=req.bill_idp,
            exclude_bill_idp=req.exclude_bill_idp,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/rag/chat/stream")
async def rag_chat_stream(req: RAGChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=422, detail="question cannot be empty")

    async def event_stream():
        from agents.rag import stream_rag_chat_events

        try:
            async for event in stream_rag_chat_events(
                req.question,
                top_k=req.top_k,
                threshold=req.threshold,
                source=req.source,
                bill_idp=req.bill_idp,
                exclude_bill_idp=req.exclude_bill_idp,
            ):
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception as exc:
            yield json.dumps(
                {
                    "type": "error",
                    "error": str(exc),
                },
                ensure_ascii=False,
            ) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson; charset=utf-8",
    )


@app.get("/rag/bills/{idp}/context")
def rag_bill_context(idp: int):
    try:
        from agents.rag_tools import get_bill_context
        return get_bill_context(idp)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/rag/documents/{document_id}")
def rag_document_detail(document_id: str):
    try:
        from agents.rag_tools import get_document_by_id
        return get_document_by_id(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/rag/chunks/{chunk_id}")
def rag_chunk_detail(chunk_id: str):
    try:
        from agents.rag_tools import get_chunk_by_id
        return get_chunk_by_id(chunk_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/rag/chunks/{chunk_id}/excerpt")
def rag_chunk_excerpt(
    chunk_id: str,
    query: Optional[str] = Query(None, description="Optional query used to focus the excerpt"),
    sentences: int = Query(3, ge=1, le=8),
    max_chars: int = Query(1200, ge=200, le=4000),
):
    try:
        from agents.rag_tools import get_chunk_excerpt
        return get_chunk_excerpt(
            chunk_id,
            query=query,
            max_sentences=sentences,
            max_chars=max_chars,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/rag/explain-match")
def rag_explain_match(req: RAGExplainMatchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=422, detail="query cannot be empty")
    try:
        from agents.rag_tools import explain_chunk_match
        return explain_chunk_match(
            req.query,
            req.chunk_id,
            source=req.source,
            bill_idp=req.bill_idp,
            document_type=req.document_type,
            exclude_bill_idp=req.exclude_bill_idp,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/rag/bills/compare")
def rag_compare_bill(req: RAGBillCompareRequest):
    try:
        from agents.rag_tools import compare_bill_to_corpus
        return compare_bill_to_corpus(
            req.idp,
            top_k=req.top_k,
            threshold=req.threshold,
            source=req.source,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/rag/reindex")
def rag_reindex(req: RAGReindexRequest):
    if req.source not in ("bills", "legislatie-just"):
        raise HTTPException(status_code=422, detail="source must be 'bills' or 'legislatie-just'")
    if req.source == "bills" and not req.all and not req.file:
        raise HTTPException(status_code=422, detail="source='bills' requires all=true or file")

    cmd = [sys.executable, "rag_index.py", "--source", req.source]
    if req.all:
        cmd.append("--all")
    if req.file:
        cmd.extend(["--file", req.file])
    if req.year is not None:
        cmd.extend(["--year", str(req.year)])
    cmd.extend(["--from-year", str(req.from_year), "--to-year", str(req.to_year)])
    cmd.extend(["--page-size", str(req.page_size)])
    if req.max_pages is not None:
        cmd.extend(["--max-pages", str(req.max_pages)])
    if req.limit is not None:
        cmd.extend(["--limit", str(req.limit)])
    if req.changed_only:
        cmd.append("--changed-only")
    if req.dry_run:
        cmd.append("--dry-run")

    root = Path(__file__).resolve().parents[1]
    try:
        completed = subprocess.run(
            cmd,
            cwd=root,
            capture_output=True,
            text=True,
            timeout=900,
            check=True,
        )
        return {
            "status": "ok",
            "command": cmd,
            "stdout": completed.stdout[-4000:],
            "stderr": completed.stderr[-2000:],
        }
    except subprocess.CalledProcessError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "command": cmd,
                "returncode": exc.returncode,
                "stdout": exc.stdout[-4000:] if exc.stdout else "",
                "stderr": exc.stderr[-2000:] if exc.stderr else "",
            },
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail={
                "command": cmd,
                "stdout": (exc.stdout or "")[-4000:],
                "stderr": (exc.stderr or "")[-2000:],
                "message": "rag reindex timed out",
            },
        )


@app.get("/rag/eval-report")
def rag_eval_report():
    path = Path("data/processed/rag_eval_last.json")
    if not path.exists():
        raise HTTPException(status_code=404, detail="No RAG eval report found yet")
    return json.loads(path.read_text(encoding="utf-8"))


@app.post("/rag/eval")
def rag_eval(req: RAGEvalRequest | None = None):
    payload = req or RAGEvalRequest()
    cmd = [sys.executable, "eval_rag.py", "--cases", payload.cases, "--report", payload.report]
    if payload.limit is not None:
        cmd.extend(["--limit", str(payload.limit)])

    root = Path(__file__).resolve().parents[1]
    try:
        completed = subprocess.run(
            cmd,
            cwd=root,
            capture_output=True,
            text=True,
            timeout=900,
            check=True,
        )
        report_path = root / payload.report
        report = (
            json.loads(report_path.read_text(encoding="utf-8"))
            if report_path.exists()
            else None
        )
        return {
            "status": "ok",
            "command": cmd,
            "stdout": completed.stdout[-4000:],
            "stderr": completed.stderr[-2000:],
            "report": report,
        }
    except subprocess.CalledProcessError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "command": cmd,
                "returncode": exc.returncode,
                "stdout": exc.stdout[-4000:] if exc.stdout else "",
                "stderr": exc.stderr[-2000:] if exc.stderr else "",
            },
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail={
                "command": cmd,
                "stdout": (exc.stdout or "")[-4000:],
                "stderr": (exc.stderr or "")[-2000:],
                "message": "rag eval timed out",
            },
        )


# ── Stats (useful for dashboard overview) ─────────────────────────────────────

@app.get("/notifications/events")
def list_notification_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    idp: Optional[int] = Query(None, description="Filter by bill idp"),
    limit: int = Query(100, ge=1, le=500),
):
    events = _load_notification_events()
    flags = _load_bill_flags()

    if event_type:
        events = [e for e in events if e.get("event_type") == event_type]
    if idp is not None:
        events = [e for e in events if e.get("idp") == idp]

    def event_key(event: dict) -> str:
        if event["event_type"] == "new_bill":
            return f"bill:{event['idp']}:new_bill"
        if event["event_type"] == "analysis_created":
            return f"bill:{event['idp']}:analysis_created"
        return f"vote:{event.get('idv')}:new_final_vote"

    events = sorted(events, key=lambda e: e.get("detected_at") or "", reverse=True)[:limit]
    return {
        "total": len(events),
        "items": [
            {
                **event,
                "event_key": event_key(event),
                "flag_record": flags.get(event_key(event), {}),
            }
            for event in events
        ],
    }


@app.post("/notifications/run")
def run_notification_watchdog(req: NotificationRunRequest | None = None):
    from agents.notifications import run_notifications

    result = run_notifications(
        data_dir=str(DATA_RAW),
        processed_dir=str(DATA_PROCESSED),
        preferences_path=(
            req.preferences_path
            if req and req.preferences_path
            else str(DATA_PROCESSED / "notification_preferences.json")
        ),
    )
    return {
        "events_detected": len(result.get("events", [])),
        "events_classified": len(result.get("flags", {})),
        "jobs_queued": len(result.get("jobs", [])),
    }


@app.get("/notifications/jobs")
def list_notification_jobs(
    status: Optional[str] = Query(None, description="Filter by job status"),
    email: Optional[str] = Query(None, description="Filter by recipient email"),
    limit: int = Query(100, ge=1, le=500),
):
    jobs = _load_notification_jobs()

    if status:
        jobs = [j for j in jobs if j.get("status") == status]
    if email:
        jobs = [j for j in jobs if j.get("email", "").casefold() == email.casefold()]

    jobs = sorted(jobs, key=lambda j: j.get("created_at") or "", reverse=True)[:limit]
    return {"total": len(jobs), "items": jobs}


@app.post("/notifications/deliver")
def deliver_notification_jobs(req: NotificationDeliverRequest):
    from agents.notification_delivery import run_notification_delivery

    return run_notification_delivery(
        processed_dir=str(DATA_PROCESSED),
        limit=req.limit,
        dry_run=True,
    )


@app.get("/stats")
def stats():
    bills  = _load_bills()
    scores = _load_impact_scores()

    all_cats: dict[str, int] = {}
    party_counts: dict[str, int] = {}

    for b in bills:
        ai = b.get("ai_analysis") or {}
        for cat in ai.get("impact_categories", []):
            all_cats[cat] = all_cats.get(cat, 0) + 1
        dp = ai.get("dominant_party", "")
        if dp:
            party_counts[dp] = party_counts.get(dp, 0) + 1

    return {
        "total_bills":    len(bills),
        "bills_analysed": sum(1 for b in bills if b.get("ai_analysis")),
        "total_mps":      len(scores),
        "categories":     dict(sorted(all_cats.items(), key=lambda x: -x[1])),
        "dominant_parties": dict(sorted(party_counts.items(), key=lambda x: -x[1])),
        "avg_score":      round(sum(s["score"] for s in scores) / len(scores), 1) if scores else 0,
    }
