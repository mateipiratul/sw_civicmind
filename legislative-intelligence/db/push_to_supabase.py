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

# Fix encoding for console output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from supabase import create_client, Client
from env_setup import load_project_env

PROCESSED_DIR = Path("data/processed")

def get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(url, key)
...
def main():
    load_project_env()
    parser = argparse.ArgumentParser()

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

    # 2. Upsert vote sessions
    for vs in bill.get("vote_sessions", []):
        idv = vs["idv"]
        db.table("vote_sessions").upsert({
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
        }).execute()

        # Party results
        for party_data in vs.get("by_party", []):
            if not isinstance(party_data, dict) or 'party' not in party_data:
                continue
            db.table("party_vote_results").upsert({
                "vote_session_id": idv,
                "party":           party_data["party"],
                "for_votes":       party_data.get("for", 0),
                "against":         party_data.get("against", 0),
                "abstain":         party_data.get("abstain", 0),
                "absent":          party_data.get("absent", 0),
            }, on_conflict="vote_session_id,party").execute()

        # Parliamentarians and MP votes
        mp_rows = []
        vote_rows = []
        for mv in vs.get("nominal_votes", []):
            mp_rows.append({"mp_slug": mv["mp_slug"], "mp_name": mv["mp_name"], "party": mv["party"]})
            vote_rows.append({"idv": idv, "mp_slug": mv["mp_slug"], "party": mv["party"], "vote": mv["vote"]})

        if mp_rows:
            for i in range(0, len(mp_rows), 200):
                db.table("parliamentarians").upsert(mp_rows[i:i+200], on_conflict="mp_slug").execute()
        if vote_rows:
            for i in range(0, len(vote_rows), 200):
                db.table("mp_votes").upsert(vote_rows[i:i+200], on_conflict="idv,mp_slug").execute()

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

        # Impact Categories (M2M)
        for cat_name in ai.get("impact_categories", []):
            if not cat_name: continue
            slug = slugify(cat_name)
            cat_res = db.table("impact_categories").upsert({"name": cat_name, "slug": slug}, on_conflict="slug").execute()
            cat_id = cat_res.data[0]["id"]
            db.table("ai_analyses_rel_impact_categories").upsert({"aianalysis_id": idp, "impactcategory_id": cat_id}, on_conflict="aianalysis_id,impactcategory_id").execute()

        # Affected Profiles (M2M)
        for prof_name in ai.get("affected_profiles", []):
            if not prof_name: continue
            slug = slugify(prof_name)
            prof_res = db.table("affected_profiles").upsert({"name": prof_name, "slug": slug}, on_conflict="slug").execute()
            prof_id = prof_res.data[0]["id"]
            db.table("ai_analyses_rel_affected_profiles").upsert({"aianalysis_id": idp, "affectedprofile_id": prof_id}, on_conflict="aianalysis_id,affectedprofile_id").execute()

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
    main()
