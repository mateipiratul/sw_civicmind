"""
Pushes scraped bill JSON files into Supabase.
Run after main.py + enrich_ocr.py.

Usage:
    python db/push_to_supabase.py
    python db/push_to_supabase.py --file bill_23048.json
"""
import argparse
import json
import os
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
PROCESSED_DIR = Path("data/processed")


def get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def _as_json(value, default):
    return value if value is not None else default


def _notification_event_key(event: dict) -> str:
    if event["event_type"] == "new_bill":
        return f"bill:{event['idp']}:new_bill"
    if event["event_type"] == "analysis_created":
        return f"bill:{event['idp']}:analysis_created"
    return f"vote:{event.get('idv')}:new_final_vote"


def _load_preferences(path: Path) -> list[dict]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return raw
    return raw.get("users", [])


def push_bill(bill: dict, db: Client) -> None:
    idp = bill["idp"]
    docs = bill.get("documents", {})
    ocr  = bill.get("ocr_content", {})

    # ── 1. Upsert bill ──────────────────────────────────────────────
    db.table("bills").upsert({
        "idp":              idp,
        "bill_number":      bill.get("bill_number"),
        "title":            bill.get("title"),
        "initiator_name":   bill.get("initiator", {}).get("name"),
        "initiator_type":   bill.get("initiator", {}).get("type"),
        "status":           bill.get("status"),
        "procedure":        bill.get("procedure"),
        "law_type":         bill.get("law_type"),
        "decision_chamber": bill.get("decision_chamber"),
        "registered_at":    bill.get("registered_at"),
        "adopted_at":       bill.get("adopted_at"),
        "source_url":       bill.get("source_url"),
        "scraped_at":       bill.get("scraped_at"),
        "doc_expunere_url": docs.get("expunere_de_motive"),
        "doc_forma_url":    docs.get("forma_initiatorului"),
        "doc_aviz_ces_url": docs.get("aviz_ces"),
        "doc_aviz_cl_url":  docs.get("aviz_cl"),
        "doc_adoptata_url": docs.get("forma_adoptata"),
        "ocr_expunere":     ocr.get("expunere_de_motive"),
        "ocr_aviz_ces":     ocr.get("aviz_ces"),
        "ocr_aviz_cl":      ocr.get("aviz_cl"),
    }).execute()

    # ── 2. Upsert vote sessions + nominal votes ──────────────────────
    for vs in bill.get("vote_sessions", []):
        idv = vs["idv"]

        db.table("vote_sessions").upsert({
            "idv":         idv,
            "bill_idp":    idp,
            "type":        vs.get("type"),
            "date":        vs.get("date"),
            "time":        vs.get("time"),
            "description": vs.get("description"),
            "present":     vs["summary"].get("present"),
            "for_votes":   vs["summary"].get("for"),
            "against":     vs["summary"].get("against"),
            "abstain":     vs["summary"].get("abstain"),
            "absent":      vs["summary"].get("absent"),
            "by_party":    _as_json(vs.get("by_party"), []),
        }).execute()

        # Upsert parliamentarians (ignore conflicts — name/party may update later)
        mp_rows = [
            {
                "mp_slug": mv["mp_slug"],
                "mp_name": mv["mp_name"],
                "party":   mv["party"],
            }
            for mv in vs.get("nominal_votes", [])
        ]
        if mp_rows:
            # Batch in chunks of 500 to stay within Supabase limits
            for i in range(0, len(mp_rows), 500):
                db.table("parliamentarians").upsert(
                    mp_rows[i:i+500],
                    on_conflict="mp_slug",
                ).execute()

        # Upsert mp_votes
        vote_rows = [
            {
                "idv":     idv,
                "mp_slug": mv["mp_slug"],
                "party":   mv["party"],
                "vote":    mv["vote"],
            }
            for mv in vs.get("nominal_votes", [])
        ]
        if vote_rows:
            for i in range(0, len(vote_rows), 500):
                db.table("mp_votes").upsert(
                    vote_rows[i:i+500],
                    on_conflict="idv,mp_slug",
                ).execute()

    # ── 3. Upsert ai_analysis if present ────────────────────────────
    ai = bill.get("ai_analysis")
    if ai:
        args = ai.get("arguments", {})
        db.table("ai_analyses").upsert({
            "bill_idp":          idp,
            "processed_at":      ai.get("processed_at"),
            "model":             ai.get("model"),
            "title_short":       ai.get("title_short"),
            "key_ideas":         _as_json(ai.get("key_ideas"), []),
            "impact_categories": _as_json(ai.get("impact_categories"), []),
            "affected_profiles": _as_json(ai.get("affected_profiles"), []),
            "arguments":         _as_json(args, {}),
            "pro_arguments":     _as_json(args.get("pro"), []),
            "con_arguments":     _as_json(args.get("con"), []),
            "controversy_score": ai.get("controversy_score"),
            "passed_by":         ai.get("passed_by"),
            "dominant_party":    ai.get("dominant_party"),
            "vote_date":         ai.get("vote_date"),
            "ocr_quality":       ai.get("ocr_quality"),
            "confidence":        ai.get("confidence"),
        }).execute()

    nom_count = sum(len(vs.get("nominal_votes", [])) for vs in bill.get("vote_sessions", []))
    print(f"  [OK] {bill.get('bill_number')} — {nom_count} MP votes pushed")


def push_impact_scores(db: Client, path: Path) -> None:
    if not path.exists():
        print(f"\n[WARN] Impact scores file not found: {path}")
        return

    scores = json.loads(path.read_text(encoding="utf-8"))
    rows = [
        {
            "mp_slug":          row.get("mp_slug"),
            "score":            row.get("score"),
            "total_votes":      row.get("total_votes"),
            "for_count":        row.get("for_count"),
            "against_count":    row.get("against_count"),
            "abstain_count":    row.get("abstain_count"),
            "absent_count":     row.get("absent_count"),
            "categories_voted": _as_json(row.get("categories_voted"), []),
            "narrative":        row.get("narrative"),
            "calculated_at":    row.get("calculated_at"),
        }
        for row in scores
        if row.get("mp_slug")
    ]

    for i in range(0, len(rows), 500):
        db.table("impact_scores").upsert(
            rows[i:i+500],
            on_conflict="mp_slug",
        ).execute()

    print(f"\n[OK] {len(rows)} impact scores pushed")


def push_notification_preferences(db: Client, path: Path) -> None:
    users = _load_preferences(path)
    if not users:
        print(f"\n[INFO] No notification preferences found at {path}")
        return

    user_rows = [
        {
            "user_id": user.get("user_id") or user.get("email"),
            "email": user.get("email"),
            "name": user.get("name"),
            "email_opt_in": bool(user.get("email_opt_in")),
            "unsubscribed_at": user.get("unsubscribed_at"),
        }
        for user in users
        if user.get("email")
    ]
    pref_rows = [
        {
            "user_id": user.get("user_id") or user.get("email"),
            "categories": _as_json(user.get("categories"), []),
            "profiles": _as_json(user.get("profiles"), []),
            "flags": _as_json(user.get("flags"), []),
            "frequency": user.get("frequency", "weekly"),
            "min_importance": user.get("min_importance", "normal"),
            "major_alerts": bool(user.get("major_alerts", True)),
        }
        for user in users
        if user.get("email")
    ]

    if user_rows:
        db.table("users").upsert(user_rows, on_conflict="user_id").execute()
    if pref_rows:
        db.table("notification_preferences").upsert(pref_rows, on_conflict="user_id").execute()

    print(f"\n[OK] {len(user_rows)} notification users/preferences pushed")


def push_notification_outputs(db: Client, processed_dir: Path) -> None:
    events_path = processed_dir / "bill_events.json"
    flags_path = processed_dir / "bill_flags.json"
    jobs_path = processed_dir / "notification_jobs.json"
    deliveries_path = processed_dir / "notification_deliveries.json"

    events = json.loads(events_path.read_text(encoding="utf-8")) if events_path.exists() else []
    flags = json.loads(flags_path.read_text(encoding="utf-8")) if flags_path.exists() else {}
    jobs = json.loads(jobs_path.read_text(encoding="utf-8")) if jobs_path.exists() else []
    deliveries = json.loads(deliveries_path.read_text(encoding="utf-8")) if deliveries_path.exists() else []

    event_rows = [
        {
            "event_key": _notification_event_key(event),
            "event_type": event.get("event_type"),
            "idp": event.get("idp"),
            "idv": event.get("idv"),
            "bill_number": event.get("bill_number"),
            "source": event.get("source", "cdep"),
            "chamber": event.get("chamber", "deputies"),
            "vote_date": event.get("vote_date"),
            "summary": _as_json(event.get("summary"), {}),
            "detected_at": event.get("detected_at"),
        }
        for event in events
    ]
    flag_rows = list(flags.values()) if isinstance(flags, dict) else flags
    job_rows = jobs
    delivery_rows = [
        {
            "delivery_id": row.get("delivery_id"),
            "job_id": row.get("job_id"),
            "provider": row.get("provider"),
            "provider_message_id": row.get("provider_message_id"),
            "status": row.get("status"),
            "delivered_at": row.get("delivered_at"),
            "error": row.get("error"),
            "created_at": row.get("created_at"),
        }
        for row in deliveries
        if row.get("job_id")
    ]

    for rows, table, conflict in (
        (event_rows, "bill_events", "event_key"),
        (flag_rows, "bill_flags", "event_key"),
        (job_rows, "notification_jobs", "job_id"),
        (delivery_rows, "notification_deliveries", "delivery_id"),
    ):
        for i in range(0, len(rows), 500):
            db.table(table).upsert(rows[i:i+500], on_conflict=conflict).execute()

    print(
        f"\n[OK] Notifications pushed: "
        f"{len(event_rows)} events, {len(flag_rows)} flag rows, "
        f"{len(job_rows)} jobs, {len(delivery_rows)} deliveries"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Single filename in data/raw/ to push")
    parser.add_argument("--dir", default="data/raw")
    parser.add_argument("--scores", default="data/processed/impact_scores.json")
    parser.add_argument("--preferences", default="data/processed/notification_preferences.json")
    parser.add_argument(
        "--skip-scores",
        action="store_true",
        help="Only push bill data; skip data/processed/impact_scores.json",
    )
    parser.add_argument(
        "--skip-notifications",
        action="store_true",
        help="Skip notification preferences/events/jobs",
    )
    args = parser.parse_args()

    db = get_client()
    raw_dir = Path(args.dir)

    if args.file:
        files = [raw_dir / args.file]
    else:
        files = sorted(raw_dir.glob("bill_*.json"))

    print(f"Pushing {len(files)} bills to Supabase...")
    for path in files:
        bill = json.loads(path.read_text(encoding="utf-8"))
        push_bill(bill, db)

    if args.file and not args.skip_scores:
        print("\n[INFO] Skipping impact scores for single-file push; run a full sync to push scores.")
    elif not args.skip_scores:
        push_impact_scores(db, Path(args.scores))

    if args.file and not args.skip_notifications:
        print("\n[INFO] Skipping notifications for single-file push; run a full sync to push notification data.")
    elif not args.skip_notifications:
        push_notification_preferences(db, Path(args.preferences))
        push_notification_outputs(db, PROCESSED_DIR)

    print(f"\nDone. {len(files)} bills synced.")


if __name__ == "__main__":
    main()
