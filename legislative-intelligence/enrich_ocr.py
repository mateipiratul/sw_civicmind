"""
Enrich existing bill JSON files with OCR text from their PDFs.
Run this after main.py has scraped the bills.

Usage:
    python enrich_ocr.py                  # process all bills in data/raw/
    python enrich_ocr.py --file bill_23048.json
"""
import argparse
import json
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from scraper.pdf_ocr import extract_bill_documents


def enrich_file(path: Path) -> None:
    with open(path, encoding="utf-8") as f:
        bill = json.load(f)

    if bill.get("ocr_content"):
        existing = {k for k, v in bill["ocr_content"].items() if v}
        if existing:
            print(f"[SKIP] {path.name} already has OCR for: {existing}")
            return

    print(f"\n[OCR] {path.name} — {bill.get('bill_number', '?')}")
    ocr_content = extract_bill_documents(bill.get("documents", {}))
    bill["ocr_content"] = ocr_content

    path.write_text(json.dumps(bill, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    extracted = {k: len(v) for k, v in ocr_content.items() if v}
    print(f"  Saved. OCR fields: {extracted}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Single filename in data/raw/ to process")
    parser.add_argument("--dir", default="data/raw", help="Directory of bill JSON files")
    args = parser.parse_args()

    raw_dir = Path(args.dir)
    if args.file:
        enrich_file(raw_dir / args.file)
    else:
        files = sorted(raw_dir.glob("bill_*.json"))
        print(f"Enriching {len(files)} bills in {raw_dir}/")
        for f in files:
            enrich_file(f)
    print("\nDone.")


if __name__ == "__main__":
    main()
