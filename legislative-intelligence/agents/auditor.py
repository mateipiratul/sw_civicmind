"""
Agent 2 — Political Auditor
Reads all bill JSONs, aggregates MP votes, computes Impact Scores,
generates a 2-sentence narrative per MP, saves to data/processed/.

Graph:
  load_votes → calculate_scores → generate_narratives → save
"""
import json
import os
import logging
import time
import asyncio
import httpx
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langgraph.graph import StateGraph, END
from mistralai.client import Mistral

from agents.state import AuditorState
from agents.prompts import AUDITOR_NARRATIVE_SYSTEM, AUDITOR_NARRATIVE_USER

logger = logging.getLogger(__name__)

_MODEL = "mistral-small-latest"
_MAX_NARRATIVE_BATCH = 20   # MPs per LLM call batch
_NARRATIVE_RETRIES = 8


from env_setup import get_mistral_api_key, SDKError


def _mistral() -> Mistral:
    return Mistral(api_key=get_mistral_api_key(raise_error=True))


async def _generate_narrative_async(client: Mistral, prompt: str, sem: asyncio.Semaphore) -> str:
    def call():
        resp = client.chat.complete(
            model=_MODEL,
            messages=[
                {"role": "system", "content": AUDITOR_NARRATIVE_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        result = json.loads(resp.choices[0].message.content)
        return result.get("narrative", "")

    last_error: Exception | None = None
    for attempt in range(_NARRATIVE_RETRIES + 1):
        try:
            async with sem:
                await asyncio.sleep(1.5)
                return await asyncio.to_thread(call)
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
                raise
            last_error = exc
            if attempt < _NARRATIVE_RETRIES:
                import random
                base_delay = 2.0 * (1.8 ** attempt)
                sleep_time = base_delay + random.uniform(0.5, 2.5)
                logger.warning(
                    f"Mistral narrative completion rate limited (attempt {attempt + 1}/{_NARRATIVE_RETRIES + 1}). "
                    f"Retrying in {sleep_time:.2f}s... Error: {exc}"
                )
                await asyncio.sleep(sleep_time)

    raise RuntimeError(f"narrative generation failed after retry: {last_error}")


# ── Score formula ─────────────────────────────────────────────────────────────

def _compute_score(votes: list[dict]) -> dict:
    total = len(votes)
    if not total:
        return {"score": 0.0, "total": 0, "for": 0, "against": 0, "abstain": 0, "absent": 0}

    for_c     = sum(1 for v in votes if v["vote"] == "for")
    against_c = sum(1 for v in votes if v["vote"] == "against")
    abstain_c = sum(1 for v in votes if v["vote"] == "abstain")
    absent_c  = sum(1 for v in votes if v["vote"] == "absent")
    decisive  = for_c + against_c

    participation = (total - absent_c) / total
    decisiveness  = decisive / total
    score = round((participation * 0.6 + decisiveness * 0.4) * 100, 1)

    return {
        "score":    score,
        "total":    total,
        "for":      for_c,
        "against":  against_c,
        "abstain":  abstain_c,
        "absent":   absent_c,
    }


# ── Nodes ─────────────────────────────────────────────────────────────────────

def load_votes(state: AuditorState) -> dict:
    data_dir = Path(state["data_dir"])
    all_votes: list[dict] = []

    for path in sorted(data_dir.glob("bill_*.json")):
        bill = json.loads(path.read_text(encoding="utf-8"))
        bill_number = bill.get("bill_number", "")
        bill_idp    = bill.get("idp")
        categories  = []
        ai = bill.get("ai_analysis") or {}
        if ai:
            categories = ai.get("impact_categories", [])

        for vs in bill.get("vote_sessions", []):
            for mv in vs.get("nominal_votes", []):
                all_votes.append({
                    "mp_slug":    mv["mp_slug"],
                    "mp_name":    mv["mp_name"],
                    "party":      mv["party"],
                    "vote":       mv["vote"],
                    "bill_number": bill_number,
                    "bill_idp":   bill_idp,
                    "categories": categories,
                })

    logger.info(f"Loaded {len(all_votes)} MP-vote records from {data_dir}")
    return {"all_votes": all_votes, "error": None}


def calculate_scores(state: AuditorState) -> dict:
    if state.get("error"):
        return {}

    by_mp: dict[str, list[dict]] = {}
    mp_meta: dict[str, dict] = {}

    for record in state["all_votes"]:
        slug = record["mp_slug"]
        if slug not in by_mp:
            by_mp[slug] = []
            mp_meta[slug] = {
                "mp_name": record["mp_name"],
                "party":   record["party"],
                "categories_voted": set(),
            }
        by_mp[slug].append(record)
        for cat in record.get("categories", []):
            mp_meta[slug]["categories_voted"].add(cat)

    scores: dict[str, dict] = {}
    for slug, votes in by_mp.items():
        s = _compute_score(votes)
        meta = mp_meta[slug]
        scores[slug] = {
            **s,
            "mp_name":          meta["mp_name"],
            "party":            meta["party"],
            "categories_voted": list(meta["categories_voted"]),
            "calculated_at":    datetime.now(timezone.utc).isoformat(),
        }

    logger.info(f"Calculated scores for {len(scores)} MPs")
    return {"scores": scores}


def generate_narratives(state: AuditorState) -> dict:
    if state.get("error"):
        return {}

    client = _mistral()
    scores = state["scores"]

    # Only generate narratives for MPs with enough data (min 3 votes)
    eligible = {k: v for k, v in scores.items() if v["total"] >= 3}
    logger.info(f"Generating narratives for {len(eligible)} MPs...")

    async def run_all():
        sem = asyncio.Semaphore(1)  # Limit to max 1 concurrent API call to avoid concurrent rate limits on free tier
        tasks = []
        slugs = []
        for slug, data in eligible.items():
            prompt = AUDITOR_NARRATIVE_USER.format(
                mp_name     = data["mp_name"],
                party       = data["party"],
                score       = data["score"],
                total       = data["total"],
                for_count   = data["for"],
                against_count = data["against"],
                abstain_count = data["abstain"],
                absent_count  = data["absent"],
                categories  = ", ".join(data["categories_voted"]) or "diverse",
            )
            tasks.append(_generate_narrative_async(client, prompt, sem))
            slugs.append(slug)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        narratives = {}
        for slug, res in zip(slugs, results):
            if isinstance(res, Exception):
                logger.warning(f"narrative failed for {slug}: {res}")
                narratives[slug] = ""
            else:
                narratives[slug] = res
        return narratives

    narratives = asyncio.run(run_all())
    return {"narratives": narratives}


def save(state: AuditorState) -> dict:
    if state.get("error"):
        logger.error(f"[AUDITOR ERROR] {state['error']}")
        return {}

    out_dir = Path(state["data_dir"]).parent / "processed"
    out_dir.mkdir(exist_ok=True)

    scores    = state["scores"]
    narratives = state.get("narratives", {})

    output = []
    for slug, data in scores.items():
        output.append({
            "mp_slug":          slug,
            "mp_name":          data["mp_name"],
            "party":            data["party"],
            "score":            data["score"],
            "total_votes":      data["total"],
            "for_count":        data["for"],
            "against_count":    data["against"],
            "abstain_count":    data["abstain"],
            "absent_count":     data["absent"],
            "categories_voted": data["categories_voted"],
            "narrative":        narratives.get(slug, ""),
            "calculated_at":    data["calculated_at"],
        })

    output.sort(key=lambda x: x["score"], reverse=True)

    out_path = out_dir / "impact_scores.json"
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(f"[AUDITOR OK] {len(output)} MP scores saved to {out_path}")
    return {}


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_auditor() -> Any:
    g = StateGraph(AuditorState)
    g.add_node("load_votes",          load_votes)
    g.add_node("calculate_scores",    calculate_scores)
    g.add_node("generate_narratives", generate_narratives)
    g.add_node("save",                save)

    g.set_entry_point("load_votes")
    g.add_edge("load_votes",          "calculate_scores")
    g.add_edge("calculate_scores",    "generate_narratives")
    g.add_edge("generate_narratives", "save")
    g.add_edge("save",                END)

    return g.compile()


_AUDITOR_GRAPH = None


def get_auditor_graph() -> Any:
    global _AUDITOR_GRAPH
    if _AUDITOR_GRAPH is None:
        _AUDITOR_GRAPH = build_auditor()
    return _AUDITOR_GRAPH


def run_auditor(data_dir: str = "data/raw") -> list[dict]:
    graph = get_auditor_graph()
    initial: AuditorState = {
        "data_dir":   data_dir,
        "all_votes":  [],
        "scores":     {},
        "narratives": {},
        "error":      None,
    }
    result = graph.invoke(initial)
    return result.get("scores", {})
