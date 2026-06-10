"""
Pushes scraped bill JSON files into Supabase.
Updated to support the relational schema used by the Django backend.
"""
import argparse
import json
import os
import sys
import io
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from supabase import Client
from db.client import get_supabase_client
from env_setup import load_project_env

PROCESSED_DIR = Path("data/processed")

def get_client() -> Client:
    return get_supabase_client()
def slugify(text: str) -> str:
    if not text:
        return "unknown"
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text).strip('-')
    return text or "unknown"

def _as_json(value, default):
    return value if value is not None else default

def push_bill(bill: dict, db: Client) -> None:
    idp = bill["idp"]
    docs = bill.get("documents", {})
    ocr  = bill.get("ocr_content", {})

    # 1. Upsert bill
    db.table("bills").upsert({
        "idp":              idp,
        "bill_number":      bill.get("bill_number"),
        "title":            bill.get("title"),
        "initiator_name":   bill.get("initiator", {}).get("name") if isinstance(bill.get("initiator"), dict) else bill.get("initiator"),
        "initiator_type":   bill.get("initiator", {}).get("type") if isinstance(bill.get("initiator"), dict) else None,
        "status":           bill.get("status"),
        "procedure":        bill.get("procedure"),
        "law_type":         bill.get("law_type"),
        "decision_chamber": bill.get("decision_chamber"),
        "registered_at":    bill.get("registered_at"),
        "adopted_at":       bill.get("adopted_at"),
        "source_url":       bill.get("source_url"),
        "doc_expunere_url": docs.get("expunere_de_motive"),
        "doc_forma_url":    docs.get("forma_initiatorului"),
        "doc_aviz_ces_url": docs.get("aviz_ces"),
        "doc_aviz_cl_url":  docs.get("aviz_cl"),
        "doc_adoptata_url": docs.get("forma_adoptata"),
        "ocr_expunere":     ocr.get("expunere_de_motive"),
        "ocr_aviz_ces":     ocr.get("aviz_ces"),
        "ocr_aviz_cl":      ocr.get("aviz_cl"),
    }).execute()

    # 2. Gather all vote sessions, party results, and nominal votes
    vote_sessions_rows = []
    party_results_rows = []
    all_mp_rows = []
    all_vote_rows = []

    for vs in bill.get("vote_sessions", []):
        idv = vs["idv"]
        vote_sessions_rows.append({
            "idv":         idv,
            "bill_idp":    idp,
            "type":        vs.get("type"),
            "date":        vs.get("date"),
            "time":        vs.get("time"),
            "description": vs.get("description"),
            "present":     vs.get("summary", {}).get("present", 0),
            "for_votes":   vs.get("summary", {}).get("for", 0),
            "against":     vs.get("summary", {}).get("against", 0),
            "abstain":     vs.get("summary", {}).get("abstain", 0),
            "absent":      vs.get("summary", {}).get("absent", 0),
        })

        for party_data in vs.get("by_party", []):
            if not isinstance(party_data, dict) or 'party' not in party_data:
                continue
            party_results_rows.append({
                "vote_session_id": idv,
                "party":           party_data["party"],
                "for_votes":       party_data.get("for", 0),
                "against":         party_data.get("against", 0),
                "abstain":         party_data.get("abstain", 0),
                "absent":          party_data.get("absent", 0),
            })

        for mv in vs.get("nominal_votes", []):
            all_mp_rows.append({"mp_slug": mv["mp_slug"], "mp_name": mv["mp_name"], "party": mv["party"]})
            all_vote_rows.append({"idv": idv, "mp_slug": mv["mp_slug"], "party": mv["party"], "vote": mv["vote"]})

    # Execute vote sessions upsert in batch
    if vote_sessions_rows:
        db.table("vote_sessions").upsert(vote_sessions_rows).execute()

    # Execute party results upsert in batch
    if party_results_rows:
        db.table("party_vote_results").upsert(party_results_rows, on_conflict="vote_session_id,party").execute()

    # Execute parliamentarians upsert in batch
    if all_mp_rows:
        unique_mps = {}
        for row in all_mp_rows:
            unique_mps[row["mp_slug"]] = row
        deduped_mps = list(unique_mps.values())
        for i in range(0, len(deduped_mps), 500):
            db.table("parliamentarians").upsert(deduped_mps[i:i+500], on_conflict="mp_slug").execute()

    # Execute mp_votes upsert in batch
    if all_vote_rows:
        for i in range(0, len(all_vote_rows), 500):
            db.table("mp_votes").upsert(all_vote_rows[i:i+500], on_conflict="idv,mp_slug").execute()

    # 3. Upsert ai_analysis
    ai = bill.get("ai_analysis")
    if ai:
        db.table("ai_analyses").upsert({
            "bill_idp":          idp,
            "processed_at":      ai.get("processed_at"),
            "model":             ai.get("model"),
            "title_short":       ai.get("title_short"),
            "controversy_score": ai.get("controversy_score"),
            "passed_by":         ai.get("passed_by"),
            "dominant_party":    ai.get("dominant_party"),
            "vote_date":         ai.get("vote_date"),
            "ocr_quality":       ai.get("ocr_quality"),
            "confidence":        ai.get("confidence"),
        }).execute()

        # Impact Categories (M2M) - Batched!
        cat_rows = []
        for cat_name in ai.get("impact_categories", []):
            if not cat_name: continue
            cat_rows.append({"name": cat_name, "slug": slugify(cat_name)})
        
        if cat_rows:
            cat_res = db.table("impact_categories").upsert(cat_rows, on_conflict="slug").execute()
            slug_to_id = {row["slug"]: row["id"] for row in cat_res.data}
            rel_cat_rows = [{"aianalysis_id": idp, "impactcategory_id": slug_to_id[row["slug"]]} for row in cat_rows]
            db.table("ai_analyses_rel_impact_categories").upsert(rel_cat_rows, on_conflict="aianalysis_id,impactcategory_id").execute()

        # Affected Profiles (M2M) - Batched!
        prof_rows = []
        for prof_name in ai.get("affected_profiles", []):
            if not prof_name: continue
            prof_rows.append({"name": prof_name, "slug": slugify(prof_name)})

        if prof_rows:
            prof_res = db.table("affected_profiles").upsert(prof_rows, on_conflict="slug").execute()
            slug_to_id = {row["slug"]: row["id"] for row in prof_res.data}
            rel_prof_rows = [{"aianalysis_id": idp, "affectedprofile_id": slug_to_id[row["slug"]]} for row in prof_rows]
            db.table("ai_analyses_rel_affected_profiles").upsert(rel_prof_rows, on_conflict="aianalysis_id,affectedprofile_id").execute()

        # Key Ideas
        db.table("ai_key_ideas").delete().eq("analysis_id", idp).execute()
        key_ideas = []
        for i, text in enumerate(ai.get("key_ideas", [])):
            if text: key_ideas.append({"analysis_id": idp, "text": text, "order": i})
        if key_ideas:
            db.table("ai_key_ideas").insert(key_ideas).execute()

        # Arguments
        db.table("ai_arguments").delete().eq("analysis_id", idp).execute()
        arg_rows = []
        args = ai.get("arguments", {})
        for i, text in enumerate(args.get("pro", [])):
            if text: arg_rows.append({"analysis_id": idp, "type": "pro", "text": text, "order": i})
        for i, text in enumerate(args.get("con", [])):
            if text: arg_rows.append({"analysis_id": idp, "type": "con", "text": text, "order": i})
        if arg_rows:
            db.table("ai_arguments").insert(arg_rows).execute()

    print(f"  [OK] Bill {idp} synced")

def main():
    load_project_env()
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Single filename in data/raw/")
    args = parser.parse_args()
    db = get_client()
    raw_dir = Path("data/raw")
    files = [raw_dir / args.file] if args.file else sorted(raw_dir.glob("bill_*.json"))
    for path in files:
        if path.exists():
            push_bill(json.loads(path.read_text(encoding="utf-8")), db)
    print("Sync complete")

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    main()
