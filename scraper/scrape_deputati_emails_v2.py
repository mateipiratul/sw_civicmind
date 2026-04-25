"""
Final scraper for Chamber of Deputies emails.

Targets the current legislature page, keeps only active deputies, and extracts
email addresses from the visible profile content instead of generic template
addresses from the page footer.
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import time
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from urllib.parse import urljoin

import requests
import urllib3
from bs4 import BeautifulSoup, Comment
from urllib3.util.ssl_ import create_urllib3_context


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class LegacySSLAdapter(requests.adapters.HTTPAdapter):
    """Allow connections to the legacy TLS setup used by cdep.ro."""

    def init_poolmanager(self, *args, **kwargs):
        context = create_urllib3_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        context.set_ciphers("DEFAULT:@SECLEVEL=1")
        kwargs["ssl_context"] = context
        return super().init_poolmanager(*args, **kwargs)

    def send(self, request, **kwargs):
        kwargs["verify"] = False
        return super().send(request, **kwargs)


class CDEPDeputiesScraper:
    """Scrape active Chamber of Deputies members and their public email."""

    BASE_URL = "https://www.cdep.ro"
    CURRENT_LEGISLATURE = 2024
    PROFILE_LINK_RE = re.compile(r"structura2015\.mp\?[^\"']*idm=(\d+)", re.IGNORECASE)
    EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", re.IGNORECASE)
    OFFICIAL_DOMAINS = ("cdep.ro", "parlament.ro", "gov.ro")
    IGNORED_EMAILS = {
        "webmaster@cdep.ro",
        "cic@cdep.ro",
        "cic.vizite@cdep.ro",
    }

    def __init__(
        self,
        legislature: int = CURRENT_LEGISLATURE,
        request_timeout: int = 30,
        progress_every: int = 25,
    ):
        self.legislature = legislature
        self.request_timeout = request_timeout
        self.progress_every = progress_every

        self.session = requests.Session()
        self.session.mount("https://", LegacySSLAdapter())
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
        )

    def _fetch_page(self, url: str, retries: int = 3) -> Optional[str]:
        for attempt in range(1, retries + 1):
            try:
                response = self.session.get(url, timeout=self.request_timeout)
                response.raise_for_status()
                response.encoding = "iso-8859-2"
                return response.text
            except requests.RequestException as exc:
                print(f"Fetch failed ({attempt}/{retries}) for {url}: {exc}")
                if attempt < retries:
                    time.sleep(2 ** (attempt - 1))
        return None

    def get_deputies_list(self) -> List[Dict[str, Optional[str]]]:
        url = f"{self.BASE_URL}/pls/parlam/structura2015.de?leg={self.legislature}"
        html = self._fetch_page(url)
        if not html:
            return []
        return self._parse_active_deputies_list(html)

    def _parse_active_deputies_list(self, html: str) -> List[Dict[str, Optional[str]]]:
        soup = BeautifulSoup(html, "lxml")
        table = self._locate_active_deputies_table(soup)
        if table is None:
            raise ValueError("Could not locate the active deputies table on the legislature page.")

        deputies: List[Dict[str, Optional[str]]] = []
        seen_idm: set[str] = set()

        for row in table.find_all("tr"):
            profile_link = row.find("a", href=self.PROFILE_LINK_RE)
            cells = row.find_all("td")

            if not profile_link or len(cells) < 4:
                continue

            href = profile_link.get("href", "")
            match = self.PROFILE_LINK_RE.search(href)
            if not match:
                continue

            idm = match.group(1)
            if idm in seen_idm:
                continue
            seen_idm.add(idm)

            deputy = {
                "idm": idm,
                "name": self._clean_text(profile_link.get_text(" ", strip=True)),
                "electoral_district": self._clean_text(cells[2].get_text(" ", strip=True)),
                "party": self._clean_text(cells[3].get_text(" ", strip=True)),
                "member_since_note": self._clean_text(cells[4].get_text(" ", strip=True))
                if len(cells) > 4
                else "",
                "email": None,
                "profile_url": urljoin(self.BASE_URL, href),
            }
            deputies.append(deputy)

        return deputies

    def _locate_active_deputies_table(self, soup: BeautifulSoup):
        for table in soup.find_all("table"):
            header_text = " | ".join(
                self._clean_text(th.get_text(" ", strip=True)) for th in table.find_all("th")
            )
            if (
                "Nume si prenume" in header_text
                and "Circumscriptia electorala" in header_text
                and "Grupul parlamentar" in header_text
                and "Membru din" in header_text
            ):
                return table
        return None

    def get_deputy_email(self, profile_url: str) -> Optional[str]:
        html = self._fetch_page(profile_url)
        if not html:
            return None
        return self._extract_email_from_profile_html(html)

    def _extract_email_from_profile_html(self, html: str) -> Optional[str]:
        soup = BeautifulSoup(html, "lxml")
        self._remove_comments(soup)

        selectors = [
            ".mailInfo",
            ".boxInfo",
        ]

        for selector in selectors:
            email = self._pick_best_email(
                self._find_emails(node.get_text(" ", strip=True)) for node in soup.select(selector)
            )
            if email:
                return email

        mailto_candidates: List[str] = []
        for link in soup.select("a[href^='mailto:']"):
            mailto_candidates.extend(self._find_emails(link.get("href", "")))
            mailto_candidates.extend(self._find_emails(link.get_text(" ", strip=True)))

        email = self._pick_best_email([mailto_candidates])
        if email:
            return email

        visible_text = soup.get_text("\n", strip=True)
        return self._pick_best_email([self._find_emails(visible_text)])

    def _remove_comments(self, soup: BeautifulSoup) -> None:
        for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
            comment.extract()

    def _find_emails(self, text: str) -> List[str]:
        return [self._normalize_email(match) for match in self.EMAIL_RE.findall(text or "")]

    def _normalize_email(self, email: str) -> str:
        return email.strip().strip(".,;:()[]<>").lower()

    def _pick_best_email(self, grouped_candidates: Iterable[Iterable[str]]) -> Optional[str]:
        seen: set[str] = set()
        candidates: List[str] = []

        for group in grouped_candidates:
            for email in group:
                if not email or email in seen or email in self.IGNORED_EMAILS:
                    continue
                seen.add(email)
                candidates.append(email)

        if not candidates:
            return None

        return sorted(candidates, key=self._email_priority)[0]

    def _email_priority(self, email: str):
        local_part, _, domain = email.partition("@")
        score = 50

        if domain == "cdep.ro":
            score -= 20
        elif domain == "parlament.ro":
            score -= 15
        elif domain.endswith(".gov.ro"):
            score -= 10
        elif any(domain.endswith(official) for official in self.OFFICIAL_DOMAINS):
            score -= 8

        if local_part in {"webmaster", "contact", "office", "secretariat", "cabinet", "presa"}:
            score += 10

        return (score, email)

    def scrape_all_emails(
        self,
        limit: Optional[int] = None,
        delay_seconds: float = 0.5,
        progress_path: Optional[Path] = None,
    ) -> List[Dict[str, Optional[str]]]:
        deputies = self.get_deputies_list()
        if limit is not None:
            deputies = deputies[:limit]

        total = len(deputies)
        print(f"Found {total} active deputies in legislature {self.legislature}.")

        results: List[Dict[str, Optional[str]]] = []
        for index, deputy in enumerate(deputies, start=1):
            print(f"[{index}/{total}] Fetching profile for idm={deputy['idm']}")
            result = dict(deputy)
            result["email"] = self.get_deputy_email(deputy["profile_url"])
            results.append(result)

            if progress_path and index % self.progress_every == 0:
                self.save_to_json(results, progress_path)
                print(f"Progress saved after {index} deputies.")

            if delay_seconds > 0 and index < total:
                time.sleep(delay_seconds)

        if progress_path:
            self.save_to_json(results, progress_path)
            print("Progress file synced with final results.")

        return results

    def save_to_json(self, data: List[Dict[str, Optional[str]]], output_path: Path | str) -> None:
        path = Path(output_path)
        with path.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
        print(f"Saved {len(data)} records to {path}")

    def close(self) -> None:
        self.session.close()

    @staticmethod
    def _clean_text(text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").replace("\xa0", " ")).strip()


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Scrape public email addresses for active Chamber of Deputies members."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Process only the first N deputies, useful for quick checks.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay in seconds between profile requests.",
    )
    parser.add_argument(
        "--legislature",
        type=int,
        default=CDEPDeputiesScraper.CURRENT_LEGISLATURE,
        help="Legislature identifier used by cdep.ro.",
    )
    parser.add_argument(
        "--all-output",
        default="deputati_emails.json",
        help="Output JSON file for all active deputies.",
    )
    parser.add_argument(
        "--with-email-output",
        default="deputati_cu_email.json",
        help="Output JSON file containing only deputies with an email.",
    )
    parser.add_argument(
        "--progress-output",
        default="deputati_emails_progress.json",
        help="Progress file written during long runs.",
    )
    parser.add_argument(
        "--no-progress",
        action="store_true",
        help="Disable progress file writes during scraping.",
    )
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)
    base_dir = Path(__file__).resolve().parent
    all_output = base_dir / args.all_output
    with_email_output = base_dir / args.with_email_output
    progress_output = None if args.no_progress else base_dir / args.progress_output

    scraper = CDEPDeputiesScraper(legislature=args.legislature)
    try:
        results = scraper.scrape_all_emails(
            limit=args.limit,
            delay_seconds=args.delay,
            progress_path=progress_output,
        )
    finally:
        scraper.close()

    with_email = [record for record in results if record.get("email")]
    without_email = [record for record in results if not record.get("email")]

    scraper.save_to_json(results, all_output)
    scraper.save_to_json(with_email, with_email_output)

    print("Summary")
    print(f"  Total active deputies: {len(results)}")
    print(f"  With public email: {len(with_email)}")
    print(f"  Without public email: {len(without_email)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
