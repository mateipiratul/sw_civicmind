from __future__ import annotations

import re
import unicodedata
from typing import Iterable

from .models import Parliamentarian

_SUSPICIOUS_TEXT_RE = re.compile(
    r"[\u0080-\u009f\u00c3\u00c4\u00c5\u00c8\u0102\u0104\u0139\u0141\u0142\u015e\u015f\u0162\u0163]"
)
_DIACRITIC_REWARD_RE = re.compile(
    r"[\u0103\u00e2\u00ee\u0219\u021b\u0102\u00c2\u00ce\u0218\u021a"
    r"\u00e1\u00e9\u00ed\u00f3\u00f6\u0151\u00fa\u00fc\u0171"
    r"\u00c1\u00c9\u00cd\u00d3\u00d6\u0150\u00da\u00dc\u0170]"
)
_CANONICAL_DIACRITICS = str.maketrans(
    {
        "\u015f": "\u0219",
        "\u015e": "\u0218",
        "\u0163": "\u021b",
        "\u0162": "\u021a",
    }
)


def repair_text(value: str | None) -> str:
    if not value:
        return ""

    text = _canonicalize_text(" ".join(str(value).split()))
    candidates = [text]

    for encoding in ("latin1", "iso8859_2", "cp1250"):
        try:
            repaired = _canonicalize_text(text.encode(encoding).decode("utf-8"))
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
        candidates.append(repaired)

    unique_candidates = list(dict.fromkeys(candidates))
    return max(unique_candidates, key=_score_text)


def normalized_text_key(value: str | None) -> str:
    fixed = repair_text(value)
    decomposed = unicodedata.normalize("NFKD", fixed)
    without_marks = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return " ".join(without_marks.casefold().split())


def _canonicalize_text(value: str) -> str:
    return value.translate(_CANONICAL_DIACRITICS)


def dedupe_parliamentarians(items: Iterable[Parliamentarian]) -> list[Parliamentarian]:
    winners: dict[tuple[str, str], Parliamentarian] = {}

    for item in items:
        key = (
            normalized_text_key(item.mp_name),
            normalized_text_key(item.party),
        )

        current = winners.get(key)
        if current is None:
            winners[key] = item
            continue

        preferred, duplicate = _choose_preferred(current, item)
        _merge_missing_fields(preferred, duplicate)
        winners[key] = preferred

    return list(winners.values())


def _choose_preferred(left: Parliamentarian, right: Parliamentarian) -> tuple[Parliamentarian, Parliamentarian]:
    if _completeness_score(right) > _completeness_score(left):
        return right, left
    return left, right


def _completeness_score(item: Parliamentarian) -> tuple[int, int, int, int, int, int]:
    impact = getattr(item, "impact_score", None)
    prefetched_votes = getattr(item, "prefetched_votes", None) or []
    return (
        1 if impact else 0,
        int(getattr(impact, "total_votes", 0) or 0),
        len(prefetched_votes),
        1 if item.county else 0,
        1 if item.email else 0,
        1 if item.chamber else 0,
    )


def _merge_missing_fields(preferred: Parliamentarian, duplicate: Parliamentarian) -> None:
    for field in ("mp_name", "party", "county", "email", "chamber"):
        if not getattr(preferred, field, None) and getattr(duplicate, field, None):
            setattr(preferred, field, getattr(duplicate, field))

    if getattr(preferred, "impact_score", None) is None and getattr(duplicate, "impact_score", None) is not None:
        setattr(preferred, "impact_score", duplicate.impact_score)

    preferred_votes = list(getattr(preferred, "prefetched_votes", None) or [])
    duplicate_votes = list(getattr(duplicate, "prefetched_votes", None) or [])
    if not preferred_votes and duplicate_votes:
        setattr(preferred, "prefetched_votes", duplicate_votes)
        return

    if preferred_votes and duplicate_votes:
        merged_votes = {vote.pk: vote for vote in preferred_votes}
        for vote in duplicate_votes:
            merged_votes.setdefault(vote.pk, vote)
        setattr(preferred, "prefetched_votes", list(merged_votes.values()))


def _score_text(value: str) -> tuple[int, int, int]:
    suspicious = len(_SUSPICIOUS_TEXT_RE.findall(value))
    rewarded = len(_DIACRITIC_REWARD_RE.findall(value))
    controls = sum(1 for ch in value if ord(ch) < 32 or 127 <= ord(ch) <= 159)
    return (-suspicious, rewarded, -controls)
