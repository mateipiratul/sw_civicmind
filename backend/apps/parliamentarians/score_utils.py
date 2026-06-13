from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from .text_utils import repair_text

FOR_VOTES = {"for", "pentru"}
AGAINST_VOTES = {"against", "contra"}
ABSTAIN_VOTES = {"abstain", "abtinere", "abținere"}
ABSENT_VOTES = {"absent", "absentat"}


def vote_bucket(value: str | None) -> str:
    normalized = repair_text(value).casefold()
    if normalized in FOR_VOTES:
        return "for"
    if normalized in AGAINST_VOTES:
        return "against"
    if normalized in ABSTAIN_VOTES:
        return "abstain"
    if normalized in ABSENT_VOTES:
        return "absent"
    return ""


def compute_score(total: int, absent_count: int, decisive_count: int) -> float:
    if total <= 0:
        return 0.0

    participation = (total - absent_count) / total
    decisiveness = decisive_count / total
    return round((participation * 0.6 + decisiveness * 0.4) * 100, 1)


def build_impact_score_payload(
    *,
    total_votes: int,
    for_count: int,
    against_count: int,
    abstain_count: int,
    absent_count: int,
    categories_voted: Iterable[str] | None = None,
    narrative: str = "",
    calculated_at: Any = None,
) -> dict | None:
    if total_votes <= 0:
        return None

    return {
        "score": compute_score(total_votes, absent_count, for_count + against_count),
        "total_votes": total_votes,
        "for_count": for_count,
        "against_count": against_count,
        "abstain_count": abstain_count,
        "absent_count": absent_count,
        "categories_voted": sorted({repair_text(item) for item in (categories_voted or []) if item}),
        "narrative": repair_text(narrative),
        "calculated_at": calculated_at,
    }


def build_impact_score_payload_from_annotations(obj: Any) -> dict | None:
    total_votes = int(getattr(obj, "fallback_total_votes", 0) or 0)
    return build_impact_score_payload(
        total_votes=total_votes,
        for_count=int(getattr(obj, "fallback_for_count", 0) or 0),
        against_count=int(getattr(obj, "fallback_against_count", 0) or 0),
        abstain_count=int(getattr(obj, "fallback_abstain_count", 0) or 0),
        absent_count=int(getattr(obj, "fallback_absent_count", 0) or 0),
    )


def build_impact_score_payload_from_votes(votes: Iterable[Any]) -> dict | None:
    counts = {
        "for": 0,
        "against": 0,
        "abstain": 0,
        "absent": 0,
    }
    categories: set[str] = set()
    total = 0

    for vote in votes:
        total += 1
        bucket = vote_bucket(getattr(vote, "vote", None))
        if bucket:
            counts[bucket] += 1

        bill = getattr(getattr(vote, "vote_session", None), "bill", None)
        analysis = getattr(bill, "ai_analysis", None)
        if analysis:
            categories.update(cat.name for cat in analysis.rel_impact_categories.all())

    return build_impact_score_payload(
        total_votes=total,
        for_count=counts["for"],
        against_count=counts["against"],
        abstain_count=counts["abstain"],
        absent_count=counts["absent"],
        categories_voted=categories,
    )
