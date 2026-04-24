"""
CivicMind scraper entry point.

Usage:
    python main.py                  # last 14 days, up to 30 bills
    python main.py --days 30        # last 30 days
    python main.py --max 10         # limit to 10 bills (fast demo run)
    python main.py --skip-existing  # reuse existing bill JSON, add only new votes
"""
import argparse
from scraper.cdep import run_scraper

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CivicMind cdep.ro scraper")
    parser.add_argument("--days", type=int, default=14,  help="How many days back to search")
    parser.add_argument("--max",  type=int, default=30,  help="Max bills to process")
    parser.add_argument("--out",  type=str, default="data/raw", help="Output directory")
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Reuse existing bill JSON files and only append new vote sessions",
    )
    args = parser.parse_args()

    run_scraper(
        days_back=args.days,
        max_bills=args.max,
        output_dir=args.out,
        skip_existing=args.skip_existing,
    )
