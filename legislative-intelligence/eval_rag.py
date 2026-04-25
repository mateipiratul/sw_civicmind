"""
Small regression harness for CivicMind RAG retrieval.

This keeps evaluation cheap and repeatable while the corpus is still growing.
It focuses on retrieval health first, not full answer grading.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agents.rag_tools import compare_bill_to_corpus, search_legislation_chunks

DEFAULT_CASES = Path("evals/rag_queries.json")
DEFAULT_REPORT = Path("data/processed/rag_eval_last.json")


def _load_cases(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def _matches_terms(item: dict[str, Any], expected_terms: list[str]) -> bool:
    haystack = " ".join(
        [
            str(item.get("title") or ""),
            str(item.get("content") or "")[:4000],
            str(item.get("document_type") or ""),
            str(item.get("source") or ""),
        ]
    ).casefold()
    return any(term.casefold() in haystack for term in expected_terms)


def _run_case(case: dict[str, Any]) -> dict[str, Any]:
    mode = case.get("mode", "search")
    top_k = int(case.get("top_k", 5))
    threshold = float(case.get("threshold", 0.72))

    if mode == "compare_bill":
        response = compare_bill_to_corpus(
            int(case["bill_idp"]),
            top_k=top_k,
            threshold=threshold,
            source=case.get("source"),
        )
        items = response.get("items", [])
    else:
        items = search_legislation_chunks(
            str(case["query"]),
            top_k=top_k,
            threshold=threshold,
            source=case.get("source"),
            bill_idp=case.get("bill_idp"),
            document_type=case.get("document_type"),
            exclude_bill_idp=case.get("exclude_bill_idp"),
        )

    expected_source = case.get("expected_source")
    expected_terms = case.get("expected_terms_any", [])
    min_top_similarity = float(case.get("min_top_similarity", 0.0))

    top_item = items[0] if items else None
    top_similarity = float((top_item or {}).get("similarity") or 0.0)
    top_source = (top_item or {}).get("source")
    expected_source_ok = (
        True if not expected_source else any(item.get("source") == expected_source for item in items)
    )
    keyword_hit_count = sum(1 for item in items if _matches_terms(item, expected_terms)) if expected_terms else len(items)
    keyword_ok = True if not expected_terms else keyword_hit_count > 0
    similarity_ok = top_similarity >= min_top_similarity
    passed = bool(items) and expected_source_ok and keyword_ok and similarity_ok

    return {
        "name": case["name"],
        "mode": mode,
        "passed": passed,
        "result_count": len(items),
        "top_source": top_source,
        "top_similarity": round(top_similarity, 4),
        "expected_source": expected_source,
        "expected_source_ok": expected_source_ok,
        "keyword_hit_count": keyword_hit_count,
        "keyword_ok": keyword_ok,
        "min_top_similarity": min_top_similarity,
        "similarity_ok": similarity_ok,
        "top_items": [
            {
                "chunk_id": item.get("chunk_id"),
                "document_id": item.get("document_id"),
                "source": item.get("source"),
                "title": item.get("title"),
                "document_type": item.get("document_type"),
                "similarity": item.get("similarity"),
                "score": item.get("score"),
            }
            for item in items[:3]
        ],
    }


def run_eval(cases_path: Path, *, limit: int | None = None) -> dict[str, Any]:
    cases = _load_cases(cases_path)
    if limit is not None:
        cases = cases[:limit]

    results = [_run_case(case) for case in cases]
    passed = sum(1 for result in results if result["passed"])
    avg_top_similarity = (
        round(sum(result["top_similarity"] for result in results) / len(results), 4)
        if results else 0.0
    )
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cases_path": str(cases_path),
        "total_cases": len(results),
        "passed_cases": passed,
        "pass_rate": round((passed / len(results)) * 100, 1) if results else 0.0,
        "avg_top_similarity": avg_top_similarity,
        "results": results,
    }
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a small RAG retrieval regression suite.")
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES, help="Path to eval case JSON file.")
    parser.add_argument("--limit", type=int, default=None, help="Optional number of cases to run.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="Where to write the JSON report.")
    args = parser.parse_args()

    report = run_eval(args.cases, limit=args.limit)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"RAG eval: {report['passed_cases']}/{report['total_cases']} passed "
        f"({report['pass_rate']}%), avg top similarity={report['avg_top_similarity']}"
    )
    for result in report["results"]:
        marker = "PASS" if result["passed"] else "FAIL"
        print(
            f"[{marker}] {result['name']}: "
            f"top_source={result['top_source']} top_similarity={result['top_similarity']} "
            f"keyword_hits={result['keyword_hit_count']}"
        )
    print(f"Report written to {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
