"""
Harness to run evaluations over the Scout, Auditor, QA, and Messenger agents.
Uses deterministic checks and LLM-as-a-judge semantic rating (using mistral-small-latest).
"""
import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv()

from mistralai.client import Mistral
from env_setup import get_mistral_api_key

from agents.scout import run_scout
from agents.auditor import run_auditor
from agents.qa import run_qa
from agents.messenger import run_messenger

DEFAULT_CASES = Path("evals/agent_test_cases.json")
DEFAULT_REPORT = Path("data/processed/agents_eval_last.json")
JUDGE_MODEL = "mistral-small-latest"


def _mistral() -> Mistral:
    api_key = get_mistral_api_key(raise_error=True)
    return Mistral(api_key=api_key)


def _llm_judge(system: str, user: str) -> dict:
    client = _mistral()
    resp = client.chat.complete(
        model=JUDGE_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    return json.loads(resp.choices[0].message.content)


def _eval_scout(case: dict[str, Any], temp_dir: Path) -> dict[str, Any]:
    # 1. Setup temp raw file
    bill_dir = temp_dir / "raw"
    bill_dir.mkdir(parents=True, exist_ok=True)
    bill_path = bill_dir / f"bill_{case['input_bill']['idp']}.json"
    bill_path.write_text(json.dumps(case["input_bill"], ensure_ascii=False, indent=2), encoding="utf-8")

    # 2. Run Scout Agent
    run_scout(str(bill_path))

    # 3. Read output
    output_bill = json.loads(bill_path.read_text(encoding="utf-8"))
    ai = output_bill.get("ai_analysis") or {}

    # 4. Deterministic checks
    assertions = case["assertions"]
    required_keys = [
        "processed_at", "model", "title_short", "key_ideas", "impact_categories",
        "affected_profiles", "arguments", "controversy_score", "passed_by",
        "dominant_party", "vote_date"
    ]
    keys_ok = all(k in ai for k in required_keys)
    
    categories = ai.get("impact_categories") or []
    categories_ok = any(c.lower() in [expected.lower() for expected in assertions["expected_categories"]] for c in categories)

    profiles = ai.get("affected_profiles") or []
    profiles_ok = any(p.lower() in [expected.lower() for expected in assertions["expected_profiles_any"]] for p in profiles)

    key_ideas = ai.get("key_ideas") or []
    key_ideas_ok = len(key_ideas) >= assertions["min_key_ideas"]

    # 5. Judge evaluations
    judge_system = "Ești un judecător obiectiv de inteligență artificială. Evaluează acuratețea rezumatului legii."
    judge_user = f"""
Text original:
{case['input_bill']['ocr_content']['expunere_de_motive']}

Rezumat generat:
Titlu scurt: {ai.get('title_short', '')}
Idei cheie:
{chr(10).join(f"- {idea}" for idea in key_ideas)}

Evaluează rezumatul de mai sus în raport cu textul original. Oferă note de la 1 la 5 pentru:
1. Groundedness (Fidelitate): Rezumatul conține doar fapte prezente în textul original? (5 = perfect fidel, 1 = conține invenții sau extrapolară majore)
2. Relevance (Relevanță): Rezumatul surprinde aspectele principale ale legii? (5 = foarte relevant, 1 = complet nerelevant)

Răspunde strict în format JSON, folosind următoarea structură:
{{
  "groundedness": int,
  "relevance": int,
  "explanation": "explicație scurtă în limba română"
}}
"""
    judge_result = _llm_judge(judge_system, judge_user)
    judge_ok = judge_result.get("groundedness", 0) >= 4 and judge_result.get("relevance", 0) >= 4

    passed = keys_ok and categories_ok and profiles_ok and key_ideas_ok and judge_ok

    return {
        "name": case["name"],
        "agent": "scout",
        "passed": passed,
        "details": {
            "keys_present": keys_ok,
            "categories_matched": categories_ok,
            "profiles_matched": profiles_ok,
            "key_ideas_count_ok": key_ideas_ok,
            "judge_groundedness": judge_result.get("groundedness"),
            "judge_relevance": judge_result.get("relevance"),
            "judge_explanation": judge_result.get("explanation")
        }
    }


def _eval_auditor(case: dict[str, Any], temp_dir: Path) -> dict[str, Any]:
    # 1. Setup mock raw folder structure
    raw_dir = temp_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Group input votes by category to generate distinct mock bills
    by_category: dict[str, list[dict]] = {}
    for vote in case["input_votes"]:
        for cat in vote.get("categories", ["diverse"]):
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(vote)

    for i, (cat, votes) in enumerate(by_category.items(), start=1):
        nominal_votes = [
            {
                "mp_slug": v["mp_slug"],
                "mp_name": v["mp_name"],
                "party": v["party"],
                "vote": v["vote"]
            }
            for v in votes
        ]
        mock_bill = {
            "idp": 1000 + i,
            "bill_number": f"PL-x {100 + i}/2026",
            "ai_analysis": {
                "impact_categories": [cat]
            },
            "vote_sessions": [
                {
                  "idv": 2000 + i,
                  "type": "final",
                  "date": "2026-05-12",
                  "nominal_votes": nominal_votes
                }
            ]
        }
        bill_path = raw_dir / f"bill_{mock_bill['idp']}.json"
        bill_path.write_text(json.dumps(mock_bill, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2. Run Auditor Agent (writing to data/raw_eval_temp/processed/impact_scores.json)
    run_auditor(str(raw_dir))

    # 3. Read processed scores
    processed_path = temp_dir / "processed" / "impact_scores.json"
    if not processed_path.exists():
        return {"name": case["name"], "agent": "auditor", "passed": False, "error": "impact_scores.json not generated"}

    scores = json.loads(processed_path.read_text(encoding="utf-8"))
    
    # 4. Deterministic checks
    assertions = case["assertions"]
    mp_score = next((s for s in scores if s["mp_slug"] == "ionescu-vasile"), None)
    if not mp_score:
        return {"name": case["name"], "agent": "auditor", "passed": False, "error": "Target MP not found in results"}

    participation_ok = abs(mp_score.get("for_count", 0) + mp_score.get("against_count", 0) + mp_score.get("abstain_count", 0) + mp_score.get("absent_count", 0)) > 0
    score_val = mp_score.get("score") or 0.0
    score_ok = score_val >= 0.0 and score_val <= 100.0

    # 5. Judge evaluations on generated narrative
    narrative = mp_score.get("narrative") or ""
    judge_system = "Ești un judecător obiectiv de inteligență artificială. Evaluează relatarea despre un parlamentar."
    judge_user = f"""
Date voturi parlamentar:
Total voturi: {mp_score.get('total_votes')}
Voturi PENTRU: {mp_score.get('for_count')}, ÎMPOTRIVĂ: {mp_score.get('against_count')}, ABȚINERI: {mp_score.get('abstain_count')}, ABSENȚE: {mp_score.get('absent_count')}

Relatare generată:
{narrative}

Evaluează relatarea de mai sus pe o scară de la 1 la 5 pentru:
1. Factuality (Acuratețe factuală): Relatarea corespunde matematic și logic cu datele de vot furnizate? (5 = perfect corect, 1 = conține neconcordanțe grave)
2. Tone (Ton neutru): Relatarea este neutră, nepartizană și profesională? (5 = perfect neutră, 1 = părtinitoare sau critică nejustificat)

Răspunde strict în format JSON, folosind următoarea structură:
{{
  "factuality": int,
  "tone": int,
  "explanation": "explicație scurtă în limba română"
}}
"""
    judge_result = _llm_judge(judge_system, judge_user)
    judge_ok = judge_result.get("factuality", 0) >= 4 and judge_result.get("tone", 0) >= 4

    passed = participation_ok and score_ok and judge_ok

    return {
        "name": case["name"],
        "agent": "auditor",
        "passed": passed,
        "details": {
            "participation_rate_ok": participation_ok,
            "score_bounds_ok": score_ok,
            "judge_factuality": judge_result.get("factuality"),
            "judge_tone": judge_result.get("tone"),
            "judge_explanation": judge_result.get("explanation")
        }
    }


def _eval_qa(case: dict[str, Any]) -> dict[str, Any]:
    # 1. Run QA Agent
    bill = {
        "title": case["context"]["title_short"],
        "ocr_content": {
            "expunere_de_motive": case["context"]["expunere_text"]
        },
        "ai_analysis": {
            "key_ideas": case["context"]["key_ideas"],
            "arguments": {
                "pro": case["context"]["pro_args"],
                "con": case["context"]["con_args"]
            }
        }
    }

    answer_text = run_qa(bill, case["query"])

    # 2. Deterministic checks
    assertions = case["assertions"]
    forbidden_ok = not any(w.lower() in answer_text.lower() for w in assertions["forbidden_terms"])
    required_ok = any(w.lower() in answer_text.lower() for w in assertions["required_terms_any"])

    # 3. Judge evaluation
    judge_system = "Ești un judecător obiectiv de inteligență artificială. Evaluează răspunsul la o întrebare despre o lege."
    judge_user = f"""
Contextul legii:
Rezumat idei cheie: {', '.join(case['context']['key_ideas'])}
Argumente Pro: {', '.join(case['context']['pro_args'])}
Argumente Contra: {', '.join(case['context']['con_args'])}
Fragmente text lege: {case['context']['expunere_text']}

Întrebare: {case['query']}
Răspuns generat: {answer_text}

Evaluează răspunsul de mai sus pe o scară de la 1 la 5 pentru:
1. Faithfulness (Fidelitate): Răspunsul este bazat strict pe contextul oferit, fără a adăuga cunoștințe externe sau speculații? (5 = perfect fidel, 1 = conține speculații/halucinații)
2. Answer Relevance (Relevanța răspunsului): Răspunsul oferă o clarificare directă la întrebarea cetățeanului? (5 = foarte relevant și util, 1 = pe lângă subiect)

Răspunde strict în format JSON, folosind următoarea structură:
{{
  "faithfulness": int,
  "relevance": int,
  "explanation": "explicație scurtă în limba română"
}}
"""
    judge_result = _llm_judge(judge_system, judge_user)
    judge_ok = judge_result.get("faithfulness", 0) >= 4 and judge_result.get("relevance", 0) >= 4

    passed = forbidden_ok and required_ok and judge_ok

    return {
        "name": case["name"],
        "agent": "qa",
        "passed": passed,
        "details": {
            "forbidden_words_absent": forbidden_ok,
            "required_words_present": required_ok,
            "judge_faithfulness": judge_result.get("faithfulness"),
            "judge_relevance": judge_result.get("relevance"),
            "judge_explanation": judge_result.get("explanation")
        }
    }


def _eval_messenger(case: dict[str, Any]) -> dict[str, Any]:
    # 1. Run Messenger Agent
    bill = {
        "title": case["context"]["title_short"],
        "ai_analysis": {
            "key_ideas": case["context"]["key_ideas"],
            "arguments": {
                "pro": case["context"]["pro_args"],
                "con": case["context"]["con_args"]
            }
        }
    }

    draft = run_messenger(bill, "Popescu Ion", "Ionescu Maria", case["stance"])

    # 2. Deterministic checks
    assertions = case["assertions"]
    subject = draft.get("subject") or ""
    body = draft.get("body") or ""

    subject_ok = any(w.lower() in subject.lower() for w in assertions["required_subject_terms"])
    body_ok = any(w.lower() in body.lower() for w in assertions["required_body_terms"])

    # 3. Judge evaluation
    judge_system = "Ești un judecător obiectiv de inteligență artificială. Evaluează un proiect de email către un deputat."
    judge_user = f"""
Contextul legii:
Rezumat: {', '.join(case['context']['key_ideas'])}
Argumente Pro: {', '.join(case['context']['pro_args'])}
Argumente Contra: {', '.join(case['context']['con_args'])}

Poziție cerută cetățean: {case['stance']} (support / oppose)
Email redactat:
Subiect: {subject}
Corp: {body}

Evaluează proiectul de email de mai sus pe o scară de la 1 la 5 pentru:
1. Stance Alignment (Alinierea poziției): Emailul exprimă clar și corect poziția cerută (susținere sau opoziție)? (5 = perfect aliniat, 1 = poziție inversă sau ambiguă)
2. Professional Tone (Ton profesional): Emailul folosește un limbaj civic formal, politicos și respectuos în limba română? (5 = foarte profesional și politicos, 1 = agresiv sau neadecvat)

Răspunde strict în format JSON, folosind următoarea structură:
{{
  "stance_alignment": int,
  "professional_tone": int,
  "explanation": "explicație scurtă în limba română"
}}
"""
    judge_result = _llm_judge(judge_system, judge_user)
    judge_ok = judge_result.get("stance_alignment", 0) >= 4 and judge_result.get("professional_tone", 0) >= 4

    passed = subject_ok and body_ok and judge_ok

    return {
        "name": case["name"],
        "agent": "messenger",
        "passed": passed,
        "details": {
            "subject_terms_present": subject_ok,
            "body_terms_present": body_ok,
            "judge_stance_alignment": judge_result.get("stance_alignment"),
            "judge_professional_tone": judge_result.get("professional_tone"),
            "judge_explanation": judge_result.get("explanation")
        }
    }


def run_evals(cases_path: Path, temp_dir: Path) -> dict[str, Any]:
    cases = json.loads(cases_path.read_text(encoding="utf-8"))
    results = []

    # Clean prior temp folders
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    for case in cases:
        agent = case.get("agent")
        print(f"Running eval case: {case['name']} ({agent})...")
        try:
            if agent == "scout":
                res = _eval_scout(case, temp_dir)
            elif agent == "auditor":
                res = _eval_auditor(case, temp_dir)
            elif agent == "qa":
                res = _eval_qa(case)
            elif agent == "messenger":
                res = _eval_messenger(case)
            else:
                res = {"name": case["name"], "passed": False, "error": f"Unknown agent: {agent}"}
        except Exception as e:
            res = {"name": case["name"], "passed": False, "error": str(e)}
        
        results.append(res)

    # Cleanup temp dir after evals
    if temp_dir.exists():
        shutil.rmtree(temp_dir)

    passed_count = sum(1 for r in results if r.get("passed"))
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_cases": len(results),
        "passed_cases": passed_count,
        "pass_rate": round((passed_count / len(results)) * 100, 1) if results else 0.0,
        "results": results
    }
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Run evaluation suite over CivicMind agents.")
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES, help="Path to evaluation cases JSON.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="Path to write evaluation report.")
    args = parser.parse_args()

    # Create temporary scratch evaluation directory inside workspace
    temp_eval_dir = Path("data/raw_eval_temp")

    report = run_evals(args.cases, temp_eval_dir)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n==================================================")
    print(" civicmind agent evaluations completed")
    print(f" Pass rate: {report['passed_cases']}/{report['total_cases']} ({report['pass_rate']}%)")
    print("==================================================")
    for res in report["results"]:
        status = "PASS" if res.get("passed") else "FAIL"
        print(f" [{status}] {res['name']} ({res.get('agent')})")
        if not res.get("passed") and "error" in res:
            print(f"    Error: {res['error']}")
        elif "details" in res:
            print(f"    Details: {res['details']}")

    return 0 if report["passed_cases"] == report["total_cases"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
