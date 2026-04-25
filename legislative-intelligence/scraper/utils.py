import re
import unicodedata
from typing import Optional

VOTE_MAP = {"DA": "for", "NU": "against", "AB": "abstain", "-": "absent"}

_VOTE_TYPE_KEYWORDS: dict[str, list[str]] = {
    "final":      ["vot final", "adoptare", "respingere definitiv"],
    "amendment":  ["amendament", "amend"],
    "attendance": ["prezenta", "prezență", "verificare"],
}

STATUS_MAP: dict[str, list[str]] = {
    "lege":            ["lege nr", "promulgat", "publicat in monitorul oficial"],
    "la_promulgare":   ["trimis la promulgare", "la promulgare"],
    "respins":         ["respins", "respingere definitiva"],
    "incetat":         ["incetat", "procedura legislativa incetata"],
    "la_senat":        ["trimis la senat", "la senat", "adoptat de camera deputatilor"],
    "la_comisii":      ["la comisii", "comisii sesizate", "sesizata in fond"],
}


def slugify(name: str) -> str:
    name = unicodedata.normalize("NFD", name)
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    name = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return name.strip("-")


def safe_int(text: str) -> int:
    try:
        return int(re.sub(r"\s+", "", text.strip()))
    except (ValueError, AttributeError):
        return 0


def classify_vote_type(description: str) -> str:
    desc = description.lower()
    for vtype, keywords in _VOTE_TYPE_KEYWORDS.items():
        if any(kw in desc for kw in keywords):
            return vtype
    return "procedural"


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFD", text or "")
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"\s+", " ", text.lower())
    return text.strip()


def extract_bill_number(description: str) -> Optional[str]:
    # Matches: PL-x 147/2026, Pl 1/2026, PL 545/2025, etc.
    match = re.search(r"P[Ll][-x\s]*(\d+)/(\d{4})", description, re.IGNORECASE)
    if match:
        return f"PL-x {match.group(1)}/{match.group(2)}"
    return None


def detect_status(text: str) -> str:
    lower = normalize_text(text)
    for status, keywords in STATUS_MAP.items():
        if any(kw in lower for kw in keywords):
            return status
    return "la_comisii"


def detect_initiator_type(text: str) -> tuple[str, str]:
    if "Guvernul" in text or "guvern" in text.lower():
        return "Guvernul României", "government"
    if "senator" in text.lower() or "senat" in text.lower():
        return text[:80], "senator"
    if "cetățeni" in text.lower() or "cetateni" in text.lower():
        return text[:80], "citizens"
    return text[:80], "deputy"
