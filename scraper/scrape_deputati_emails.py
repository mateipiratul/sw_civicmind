"""Compatibility entry point for the finalized scraper implementation."""

try:
    from .scrape_deputati_emails_v2 import CDEPDeputiesScraper, main
except ImportError:
    from scrape_deputati_emails_v2 import CDEPDeputiesScraper, main


if __name__ == "__main__":
    raise SystemExit(main())
