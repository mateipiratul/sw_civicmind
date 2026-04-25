"""
HTML parsers for each cdep.ro page type.
All parsers receive raw HTML strings and return plain dicts.
"""
import re
from datetime import date
from bs4 import BeautifulSoup, Tag
from typing import Optional

from .utils import (
    VOTE_MAP,
    slugify,
    safe_int,
    classify_vote_type,
    detect_status,
    detect_initiator_type,
    normalize_text,
)

BASE_URL = "https://www.cdep.ro"

# PDF filename → document field name
_PDF_PATTERNS: list[tuple[str, str]] = [
    (r"/cl\d+\.pdf$",              "aviz_cl"),
    (r"/ces\d+\.pdf$",             "aviz_ces"),
    (r"/em\d+\.pdf$",              "expunere_de_motive"),
    (r"/pl\d+_cd\d+_\d+\.pdf$",   "forma_adoptata"),
    (r"/pl\d+\.pdf$",              "forma_initiatorului"),
]


def _abs_url(href: str) -> str:
    return href if href.startswith("http") else BASE_URL + href


# ---------------------------------------------------------------------------
# Vote list page: evot2015.data?cam=1&dat=YYYYMMDD
# ---------------------------------------------------------------------------

def parse_vote_list(html: str, session_date: date) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    votes: list[dict] = []
    seen_idvs: set[int] = set()  # each row has 3 links with the same idv — deduplicate

    for link in soup.find_all("a", href=re.compile(r"evot2015\.nominal\?idv=\d+", re.I)):
        idv_match = re.search(r"idv=(\d+)", link["href"])
        if not idv_match:
            continue

        idv_val = int(idv_match.group(1))
        if idv_val in seen_idvs:
            continue
        seen_idvs.add(idv_val)

        row: Optional[Tag] = link.find_parent("tr")
        if not row:
            continue

        cells = row.find_all("td")
        if len(cells) < 8:
            continue

        # Actual columns: # | Ora | Id vot | Descriere | Prezenta | Pentru | Împotriva | Abtineri | Nu au votat*
        present = safe_int(cells[4].get_text())
        for_v   = safe_int(cells[5].get_text())
        against = safe_int(cells[6].get_text())
        abstain = safe_int(cells[7].get_text())
        absent  = safe_int(cells[8].get_text()) if len(cells) > 8 else max(0, present - for_v - against - abstain)
        desc    = cells[3].get_text(strip=True)

        votes.append({
            "idv":         idv_val,
            "time":        cells[1].get_text(strip=True),
            "description": desc,
            "type":        classify_vote_type(desc),
            "date":        session_date,
            "summary": {
                "present": present,
                "for":     for_v,
                "against": against,
                "abstain": abstain,
                "absent":  absent,
            },
        })

    return votes


# ---------------------------------------------------------------------------
# Nominal vote page: evot2015.Nominal?idv={idv}
# ---------------------------------------------------------------------------

def parse_nominal_votes(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    nominal: list[dict] = []
    by_party: dict[str, dict] = {}

    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 4:
            continue

        # MP rows always start with a 1-based index ending in "." (e.g. "40.")
        row_num = cells[0].get_text(strip=True)
        if not re.match(r"^\d+\.$", row_num):
            continue

        vote_raw = cells[3].get_text(strip=True).upper()
        if vote_raw not in VOTE_MAP:
            continue

        name  = cells[1].get_text(strip=True)
        party = cells[2].get_text(strip=True)
        if not name or len(name) < 4:
            continue

        vote_norm = VOTE_MAP[vote_raw]
        nominal.append({
            "mp_slug": slugify(name),
            "mp_name": name,
            "party":   party,
            "vote":    vote_norm,
        })

        if party not in by_party:
            by_party[party] = {"party": party, "present": 0, "for": 0, "against": 0, "abstain": 0}
        by_party[party]["present"] += 1
        if vote_norm == "for":
            by_party[party]["for"] += 1
        elif vote_norm == "against":
            by_party[party]["against"] += 1
        elif vote_norm == "abstain":
            by_party[party]["abstain"] += 1

    return {
        "nominal_votes": nominal,
        "by_party":      list(by_party.values()),
    }


# ---------------------------------------------------------------------------
# Bill list page: lista?anp={year}  →  {bill_label: idp}
# ---------------------------------------------------------------------------

def parse_bill_list(html: str) -> dict[str, int]:
    """Return mapping of bill labels (e.g. 'PL-x 147/2026') → idp."""
    soup = BeautifulSoup(html, "lxml")
    lookup: dict[str, int] = {}

    for link in soup.find_all("a", href=re.compile(r"proiect\?.*idp=\d+", re.I)):
        idp_match = re.search(r"idp=(\d+)", link["href"])
        if not idp_match:
            continue
        label = link.get_text(strip=True)  # e.g. "PL-x 147/02.04.2026"

        # Normalize to "147/2026" key for flexible matching
        num_match = re.search(r"(\d+)/\d{2}\.\d{2}\.(\d{4})", label)
        if num_match:
            key = f"{num_match.group(1)}/{num_match.group(2)}"
            lookup[key] = int(idp_match.group(1))

    return lookup


# ---------------------------------------------------------------------------
# Bill detail page: proiect?cam=2&idp={idp}
# ---------------------------------------------------------------------------

def parse_bill_detail(html: str, idp: int) -> dict:
    soup = BeautifulSoup(html, "lxml")
    full_text = soup.get_text(" ", strip=True)

    title = _extract_title(soup)
    docs  = _extract_documents(soup)
    vote_idvs = _extract_vote_idvs(soup)
    initiator_name, initiator_type = _extract_initiator(soup, full_text)
    status_text = _extract_status_text(soup)
    status = detect_status(status_text or full_text)
    dates  = _extract_dates(full_text)

    return {
        "idp":           idp,
        "title":         title,
        "initiator":     {"name": initiator_name, "type": initiator_type},
        "status":        status,
        "documents":     docs,
        "vote_idv_list": vote_idvs,
        **dates,
    }


def _extract_title(soup: BeautifulSoup) -> str:
    # Title is usually in a prominent bold/heading tag with legislative keywords
    for tag in soup.find_all(["h1", "h2", "h3", "b", "strong", "td"]):
        text = tag.get_text(" ", strip=True)
        if len(text) > 40 and re.search(
            r"(lege|ordonan|propunere legislativ|proiect de lege)", text, re.I
        ):
            return text[:500]
    return "Titlu nedisponibil"


def _extract_documents(soup: BeautifulSoup) -> dict:
    docs: dict[str, str] = {}
    for link in soup.find_all("a", href=True):
        href: str = link["href"]
        if not href.lower().endswith(".pdf"):
            continue
        full = _abs_url(href)
        for pattern, field in _PDF_PATTERNS:
            if re.search(pattern, href, re.I) and field not in docs:
                docs[field] = full
                break
    return docs


def _extract_status_text(soup: BeautifulSoup) -> str:
    """
    CDEP detail pages include historical Chamber/Senate text in many places.
    Prefer the specific legislative status row so unrelated page text cannot
    accidentally classify everything as "la_senat".
    """
    label_patterns = [
        "stadiu legislativ",
        "stadiul legislativ",
        "procedura legislativa",
        "procedura legislativa incetata",
    ]

    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if not cells:
            continue

        cell_texts = [cell.get_text(" ", strip=True) for cell in cells]
        normalized = [normalize_text(text) for text in cell_texts]

        for idx, text in enumerate(normalized):
            if not any(pattern in text for pattern in label_patterns):
                continue

            if idx + 1 < len(cell_texts):
                value = " ".join(t for t in cell_texts[idx + 1:] if t).strip()
                if value:
                    return value

            row_text = " ".join(t for t in cell_texts if t).strip()
            for pattern in label_patterns:
                row_text = re.sub(pattern, "", row_text, flags=re.I)
            if row_text:
                return row_text

    for label in soup.find_all(string=lambda s: s and any(p in normalize_text(s) for p in label_patterns)):
        parent = label.parent
        if not parent:
            continue

        sibling = parent.find_next_sibling()
        if sibling:
            text = sibling.get_text(" ", strip=True)
            if text:
                return text

        parent_text = parent.get_text(" ", strip=True)
        if parent_text:
            return parent_text

    return ""


def _extract_vote_idvs(soup: BeautifulSoup) -> list[int]:
    idvs: list[int] = []
    for link in soup.find_all("a", href=re.compile(r"evot2015\.Nominal\?idv=\d+", re.I)):
        m = re.search(r"idv=(\d+)", link["href"])
        if m:
            idvs.append(int(m.group(1)))
    return list(dict.fromkeys(idvs))  # deduplicate preserving order


def _extract_initiator(soup: BeautifulSoup, full_text: str) -> tuple[str, str]:
    # Look for a link to a deputy/senator profile, or the word "Guvernul"
    for link in soup.find_all("a", href=re.compile(r"(deputat|senator)", re.I)):
        name = link.get_text(strip=True)
        if name:
            return name, "deputy"
    return detect_initiator_type(full_text)


def _extract_dates(text: str) -> dict:
    # Pattern: dd.mm.yyyy
    all_dates = re.findall(r"\b(\d{2})\.(\d{2})\.(\d{4})\b", text)
    if not all_dates:
        return {"registered_at": None, "adopted_at": None}

    def to_iso(d: tuple) -> str:
        return f"{d[2]}-{d[1]}-{d[0]}"

    registered = to_iso(all_dates[0]) if all_dates else None
    # "adopted" date is the last date before a "promulgare" or "lege" keyword
    adopted = None
    for m in re.finditer(r"(\d{2}\.\d{2}\.\d{4}).*?(adoptare|lege nr\.|promulgare)", text, re.I | re.S):
        raw = m.group(1).split(".")
        adopted = f"{raw[2]}-{raw[1]}-{raw[0]}"

    return {"registered_at": registered, "adopted_at": adopted}
