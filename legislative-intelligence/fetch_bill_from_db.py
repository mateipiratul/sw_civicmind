import os
import json
import sys
from pathlib import Path

# Add project root to sys.path to allow imports
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from supabase import create_client
from env_setup import load_project_env

def fetch_and_reconstruct_bill(idp: int):
    load_project_env()

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    db = create_client(url, key)

    print(f"Connecting to Supabase at {url}...")
    
    # Fetch bill
    bill_res = db.table("bills").select("*").eq("idp", idp).execute()
    if not bill_res.data:
        print(f"Bill {idp} not found in Supabase!")
        sys.exit(1)
    bill_data = bill_res.data[0]

    # Reconstruct OCR
    ocr_content = {
        "expunere_de_motive": bill_data.pop("ocr_expunere", None),
        "aviz_ces": bill_data.pop("ocr_aviz_ces", None),
        "aviz_cl": bill_data.pop("ocr_aviz_cl", None),
    }

    # Reconstruct Documents
    documents = {
        "expunere_de_motive": bill_data.pop("doc_expunere_url", None),
        "forma_initiatorului": bill_data.pop("doc_forma_url", None),
        "aviz_ces": bill_data.pop("doc_aviz_ces_url", None),
        "aviz_cl": bill_data.pop("doc_aviz_cl_url", None),
        "forma_adoptata": bill_data.pop("doc_adoptata_url", None),
    }

    # Reconstruct vote sessions
    votes_res = db.table("vote_sessions").select("*").eq("bill_idp", idp).execute()
    vote_sessions = []
    for vs in votes_res.data:
        idv = vs["idv"]
        # get party vote results
        party_res = db.table("party_vote_results").select("*").eq("vote_session_id", idv).execute()
        by_party = [
            {
                "party": p["party"],
                "for": p["for_votes"],
                "against": p["against"],
                "abstain": p["abstain"],
                "absent": p["absent"]
            }
            for p in party_res.data
        ]
        # get nominal MP votes
        try:
            mp_votes_res = db.table("mp_votes").select("*, parliamentarians(mp_name)").eq("idv", idv).execute()
            nominal_votes = []
            for mv in mp_votes_res.data:
                nominal_votes.append({
                    "mp_slug": mv["mp_slug"],
                    "mp_name": mv["parliamentarians"]["mp_name"] if mv.get("parliamentarians") else mv["mp_slug"],
                    "party": mv["party"],
                    "vote": mv["vote"]
                })
        except Exception as e:
            print(f"Warning fetching nominal votes: {e}")
            nominal_votes = []
        
        vote_sessions.append({
            "idv": idv,
            "type": vs["type"],
            "date": str(vs["date"]) if vs["date"] else None,
            "time": vs["time"],
            "description": vs["description"],
            "summary": {
                "present": vs["present"],
                "for": vs["for_votes"],
                "against": vs["against"],
                "abstain": vs["abstain"],
                "absent": vs["absent"]
            },
            "by_party": by_party,
            "nominal_votes": nominal_votes
        })

    # Reconstruct AI analysis
    ai_res = db.table("ai_analyses").select("*").eq("bill_idp", idp).execute()
    ai_analysis = {}
    if ai_res.data:
        ai = ai_res.data[0]
        # Fetch key ideas
        ki_res = db.table("ai_key_ideas").select("*").eq("analysis_id", idp).order("order").execute()
        key_ideas = [k["text"] for k in ki_res.data]
        # Fetch arguments
        arg_res = db.table("ai_arguments").select("*").eq("analysis_id", idp).order("order").execute()
        pro_args = [a["text"] for a in arg_res.data if a["type"] == "pro"]
        con_args = [a["text"] for a in arg_res.data if a["type"] == "con"]
        
        # Fetch categories
        try:
            cat_res = db.table("ai_analyses_rel_impact_categories").select("impact_categories(name)").eq("aianalysis_id", idp).execute()
            impact_categories = [c["impact_categories"]["name"] for c in cat_res.data if c.get("impact_categories")]
        except Exception as e:
            print(f"Warning fetching categories: {e}")
            impact_categories = []
            
        # Fetch profiles
        try:
            prof_res = db.table("ai_analyses_rel_affected_profiles").select("affected_profiles(name)").eq("aianalysis_id", idp).execute()
            affected_profiles = [p["affected_profiles"]["name"] for p in prof_res.data if p.get("affected_profiles")]
        except Exception as e:
            print(f"Warning fetching profiles: {e}")
            affected_profiles = []
        
        ai_analysis = {
            "processed_at": ai["processed_at"],
            "model": ai["model"],
            "title_short": ai["title_short"],
            "key_ideas": key_ideas,
            "impact_categories": impact_categories,
            "affected_profiles": affected_profiles,
            "arguments": {
                "pro": pro_args,
                "con": con_args
            },
            "controversy_score": ai["controversy_score"],
            "passed_by": ai["passed_by"],
            "dominant_party": ai["dominant_party"],
            "vote_date": str(ai["vote_date"]) if ai["vote_date"] else None,
            "ocr_quality": ai["ocr_quality"],
            "confidence": ai["confidence"]
        }

    bill = {
        "idp": idp,
        "bill_number": bill_data["bill_number"],
        "title": bill_data["title"],
        "initiator": {
            "name": bill_data.get("initiator_name"),
            "type": bill_data.get("initiator_type")
        },
        "status": bill_data.get("status"),
        "procedure": bill_data.get("procedure"),
        "law_type": bill_data.get("law_type"),
        "decision_chamber": bill_data.get("decision_chamber"),
        "registered_at": str(bill_data["registered_at"]) if bill_data["registered_at"] else None,
        "adopted_at": str(bill_data["adopted_at"]) if bill_data["adopted_at"] else None,
        "source_url": bill_data.get("source_url"),
        "documents": documents,
        "ocr_content": ocr_content,
        "vote_sessions": vote_sessions,
        "ai_analysis": ai_analysis
    }

    output_path = Path("data/raw") / f"bill_{idp}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(bill, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Successfully wrote {output_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--idp", type=int, default=17811, help="IDP of the bill to fetch")
    args = parser.parse_args()
    fetch_and_reconstruct_bill(args.idp)
