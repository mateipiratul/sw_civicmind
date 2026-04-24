"""
Main scraper orchestrator for cdep.ro.

Entry point: run_scraper()
Flow:
  1. Walk backwards day-by-day to find session days with votes
  2. For each session day, get all vote sessions (idv list)
  3. Filter for final votes only (most meaningful for the demo)
  4. For each final vote: fetch nominal data + link to bill detail
  5. Output one JSON file per bill into data/raw/
"""
import json
import re
import ssl
import time
import warnings
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import requests
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context

# cdep.ro has a self-signed cert in its chain — suppress the noise
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from .parsers import (
    parse_bill_detail,
    parse_bill_list,
    parse_nominal_votes,
    parse_vote_list,
)
from .utils import extract_bill_number

BASE_URL = "https://www.cdep.ro"


class _LegacySSLAdapter(HTTPAdapter):
    """
    cdep.ro uses a self-signed cert chain and an old TLS stack.
    We disable verification and relax ciphers inside the adapter so that
    verify=False doesn't conflict with a custom context's check_hostname.
    """
    def init_poolmanager(self, *args, **kwargs):
        ctx = create_urllib3_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
        kwargs["ssl_context"] = ctx
        super().init_poolmanager(*args, **kwargs)

    def send(self, request, **kwargs):
        kwargs["verify"] = False
        return super().send(request, **kwargs)


_SESSION = requests.Session()
_SESSION.mount("https://", _LegacySSLAdapter())

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Seconds to wait between requests — be polite to the government server
_DELAY = 0.8


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

def _fetch(url: str, retries: int = 3) -> Optional[str]:
    for attempt in range(retries):
        try:
            resp = _SESSION.get(url, headers=_HEADERS, timeout=20)
            if resp.status_code == 200:
                # cdep.ro serves ISO-8859-2 but chardet sometimes misdetects it
                resp.encoding = "iso-8859-2"
                return resp.text
            if resp.status_code == 404:
                return None
        except requests.RequestException as exc:
            if attempt == retries - 1:
                print(f"    [WARN] Failed {url}: {exc}")
    return None


# ---------------------------------------------------------------------------
# Step 1 – find recent session days
# ---------------------------------------------------------------------------

def find_session_days(days_back: int = 30) -> list[date]:
    print(f"Scanning last {days_back} days for session dates...")
    found: list[date] = []
    today = date.today()
    for i in range(days_back):
        d = today - timedelta(days=i)
        url = f"{BASE_URL}/pls/steno/evot2015.data?cam=1&dat={d.strftime('%Y%m%d')}"
        html = _fetch(url)
        if html and "evot2015.nominal" in html.lower():
            found.append(d)
            print(f"  OK {d} has votes")
        time.sleep(_DELAY)
    return found


# ---------------------------------------------------------------------------
# Step 2 – get vote sessions for one day
# ---------------------------------------------------------------------------

def get_vote_sessions(session_date: date) -> list[dict]:
    url = f"{BASE_URL}/pls/steno/evot2015.data?cam=1&dat={session_date.strftime('%Y%m%d')}"
    html = _fetch(url)
    if not html:
        return []
    return parse_vote_list(html, session_date)


# ---------------------------------------------------------------------------
# Step 3 – get nominal votes for one idv
# ---------------------------------------------------------------------------

def get_nominal_votes(idv: int) -> dict:
    url = f"{BASE_URL}/pls/steno/evot2015.Nominal?idv={idv}"
    html = _fetch(url)
    if not html:
        return {"nominal_votes": [], "by_party": []}
    return parse_nominal_votes(html)


# ---------------------------------------------------------------------------
# Step 4 – bill number → idp lookup (cached per year)
# ---------------------------------------------------------------------------

_bill_cache: dict[str, int] = {}   # key: "num/year", value: idp


def _load_bill_cache(year: int) -> None:
    url = f"{BASE_URL}/pls/proiecte/upl_pck2015.lista?anp={year}"
    html = _fetch(url)
    if not html:
        return
    entries = parse_bill_list(html)
    _bill_cache.update(entries)
    print(f"  Bill cache loaded: {len(entries)} entries for {year}")
    time.sleep(_DELAY)


def find_bill_idp(bill_number: str) -> Optional[int]:
    """
    bill_number is already normalized to "PL-x NUM/YEAR".
    Cache key is "NUM/YEAR" (e.g. "147/2026").
    """
    m = re.search(r"(\d+)/(\d{4})", bill_number)
    if not m:
        return None
    key  = f"{m.group(1)}/{m.group(2)}"
    year = int(m.group(2))

    if key in _bill_cache:
        return _bill_cache[key]

    # Load cache for that year on first miss
    _load_bill_cache(year)
    return _bill_cache.get(key)


# ---------------------------------------------------------------------------
# Step 5 – scrape full bill detail page
# ---------------------------------------------------------------------------

def scrape_bill_detail(idp: int) -> Optional[dict]:
    url = f"{BASE_URL}/pls/proiecte/upl_pck2015.proiect?cam=1&idp={idp}"
    html = _fetch(url)
    if not html:
        return None
    return parse_bill_detail(html, idp)


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def run_scraper(
    days_back: int = 14,
    max_bills: int = 30,
    output_dir: str = "data/raw",
    skip_existing: bool = False,
) -> list[dict]:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # 1. Find session days
    session_days = find_session_days(days_back)
    if not session_days:
        print("No session days found.")
        return []

    # 2. Collect all vote sessions, keep only final votes
    raw_votes: list[dict] = []
    for d in session_days:
        sessions = get_vote_sessions(d)
        # Keep only final votes on PL bills (skip PHCD/PHCS hotarari resolutions)
        final = [
            s for s in sessions
            if s["type"] == "final"
            and re.search(r"P[Ll][-x\s]*\d+/\d{4}", s["description"], re.I)
        ]
        print(f"  {d}: {len(sessions)} votes total, {len(final)} final PL bills")
        raw_votes.extend(final)
        time.sleep(_DELAY)

    raw_votes = raw_votes[:max_bills]
    print(f"\nProcessing {len(raw_votes)} final vote sessions...")

    # 3. For each final vote → nominal data + bill detail
    bills: dict[int, dict] = {}  # idp → bill document

    changed_idps: set[int] = set()

    for vote_meta in raw_votes:
        idv  = vote_meta["idv"]
        desc = vote_meta["description"]
        print(f"\n>> idv={idv}  {desc[:70]}")

        # Link to bill
        bill_number = extract_bill_number(desc)
        if not bill_number:
            print("  [SKIP] No bill number in description")
            continue

        idp = find_bill_idp(bill_number)
        if not idp:
            print(f"  [SKIP] idp not found for {bill_number}")
            continue

        time.sleep(_DELAY)

        # Scrape bill detail once per bill
        if idp not in bills:
            existing_file = output_path / f"bill_{idp}.json"
            if skip_existing and existing_file.exists():
                bills[idp] = json.loads(existing_file.read_text(encoding="utf-8"))
                bills[idp].setdefault("vote_sessions", [])
                print(f"  Reusing existing bill JSON for {bill_number}; checking votes only")
            else:
                detail = scrape_bill_detail(idp)
                if not detail:
                    print(f"  [SKIP] Could not scrape bill idp={idp}")
                    continue

                # OCR all available PDFs and embed text directly in the document
                from scraper.pdf_ocr import extract_bill_documents
                print(f"  Running OCR on documents for {bill_number}...")
                ocr_content = extract_bill_documents(detail.get("documents", {}))

                bills[idp] = {
                    **detail,
                    "bill_number":  bill_number,
                    "source_url":   f"{BASE_URL}/pls/proiecte/upl_pck2015.proiect?cam=1&idp={idp}",
                    "scraped_at":   datetime.utcnow().isoformat() + "Z",
                    "ocr_content":  ocr_content,
                    "vote_sessions": [],
                    "ai_analysis":  None,
                }
                changed_idps.add(idp)
                time.sleep(_DELAY)

        existing_idvs = {
            int(vs["idv"])
            for vs in bills[idp].get("vote_sessions", [])
            if vs.get("idv") is not None
        }
        if idv in existing_idvs:
            print(f"  [SKIP] Vote session idv={idv} already exists for {bill_number}")
            continue

        # Nominal votes are only needed for genuinely new vote sessions.
        nominal = get_nominal_votes(idv)
        time.sleep(_DELAY)

        # Attach this vote session to the bill
        bills[idp]["vote_sessions"].append({
            "idv":          idv,
            "type":         vote_meta["type"],
            "date":         vote_meta["date"].isoformat(),
            "time":         vote_meta["time"],
            "description":  desc,
            "summary":      vote_meta["summary"],
            "by_party":     nominal["by_party"],
            "nominal_votes": nominal["nominal_votes"],
        })
        changed_idps.add(idp)
        print(f"  [OK] {bill_number} (idp={idp}) - {len(nominal['nominal_votes'])} MP votes")

    # 4. Save to disk
    output = list(bills.values())
    written = 0
    for bill in output:
        if bill["idp"] not in changed_idps:
            continue
        path = output_path / f"bill_{bill['idp']}.json"
        path.write_text(
            json.dumps(bill, ensure_ascii=False, indent=2, default=str),
            encoding="utf-8",
        )
        written += 1
        print(f"Saved: {path}")

    print(f"\nDone. {written} bills written to {output_dir}/")
    return output
