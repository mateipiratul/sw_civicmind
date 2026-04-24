"""
Agent 5 - Notifications / Watchdog

Detects CDEP bill events, assigns deterministic flags, matches opt-in user
preferences, and writes queued notification jobs. It never sends email directly.

Graph:
  load_inputs -> detect_events -> classify_flags -> match_preferences -> save_outputs
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langgraph.graph import StateGraph, END

from agents.state import NotificationState

EVENTS_FILE = "bill_events.json"
FLAGS_FILE = "bill_flags.json"
JOBS_FILE = "notification_jobs.json"

IMPORTANCE_RANK = {"low": 0, "normal": 1, "high": 2, "review": 3}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def _event_key(event: dict) -> str:
    if event["event_type"] == "new_bill":
        return f"bill:{event['idp']}:new_bill"
    if event["event_type"] == "analysis_created":
        return f"bill:{event['idp']}:analysis_created"
    return f"vote:{event.get('idv')}:new_final_vote"


def _load_preferences(path: Path) -> list[dict]:
    raw = _read_json(path, {"users": []})
    if isinstance(raw, list):
        return raw
    return raw.get("users", [])


def _last_vote_session(bill: dict) -> dict:
    sessions = bill.get("vote_sessions", [])
    return sessions[-1] if sessions else {}


def _vote_outcome(session: dict) -> str:
    summary = session.get("summary", {})
    if summary.get("for", 0) > summary.get("against", 0):
        return "adopted_by_deputies"
    return "rejected_by_deputies"


def _classify_importance(flags: list[str]) -> str:
    flag_set = set(flags)
    if "needs_human_review" in flag_set:
        return "review"
    if flag_set & {"high_controversy", "narrow_vote", "rejected_by_deputies"}:
        return "high"
    if flag_set & {"new_final_vote", "adopted_by_deputies"}:
        return "normal"
    return "low"


def _bill_flags(bill: dict, event: dict) -> list[str]:
    ai = bill.get("ai_analysis") or {}
    session = _last_vote_session(bill)

    flags = [event["event_type"], "source:cdep", "chamber:deputies"]

    if event["event_type"] == "new_final_vote" and session:
        flags.append(_vote_outcome(session))

    if (bill.get("initiator") or {}).get("type") == "government":
        flags.append("government_initiative")

    if not ai:
        flags.append("needs_human_review")
    else:
        if ai.get("controversy_score", 0) >= 0.25:
            flags.append("high_controversy")
        if ai.get("passed_by") == "slim":
            flags.append("narrow_vote")
        for category in ai.get("impact_categories", []):
            flags.append(f"category:{category}")
        for profile in ai.get("affected_profiles", []):
            flags.append(f"profile:{profile}")

    return sorted(set(flags))


def _matches_preference(user: dict, flags: list[str], importance: str) -> tuple[bool, list[str]]:
    if not user.get("email_opt_in"):
        return False, []
    if user.get("unsubscribed_at"):
        return False, []

    min_importance = user.get("min_importance", "low")
    if IMPORTANCE_RANK.get(importance, 0) < IMPORTANCE_RANK.get(min_importance, 0):
        return False, []

    categories = {f"category:{c}" for c in user.get("categories", [])}
    profiles = {f"profile:{p}" for p in user.get("profiles", [])}
    user_flags = set(user.get("flags", []))
    matched = sorted((categories | profiles | user_flags) & set(flags))

    wants_major_alerts = bool(user.get("major_alerts", True))
    if wants_major_alerts and importance == "high":
        matched.append("major_alert")

    return bool(matched), sorted(set(matched))


def _draft_subject(bill: dict, event: dict, importance: str) -> str:
    ai = bill.get("ai_analysis") or {}
    title = ai.get("title_short") or bill.get("bill_number") or "proiect legislativ"
    if importance == "high":
        return f"Vot important in Camera Deputatilor: {title}"
    if event["event_type"] == "new_bill":
        return f"Proiect nou urmarit: {title}"
    return f"Camera Deputatilor a votat: {title}"


def _draft_body(user: dict, bill: dict, event: dict, flags: list[str]) -> str:
    ai = bill.get("ai_analysis") or {}
    name = user.get("name") or "Buna ziua"
    ideas = ai.get("key_ideas", [])
    idea_text = "\n".join(f"- {idea}" for idea in ideas[:3]) or "- Analiza detaliata nu este inca disponibila."

    return (
        f"{name},\n\n"
        "Camera Deputatilor are o actualizare pentru un proiect care se potriveste preferintelor tale.\n\n"
        f"Proiect: {bill.get('bill_number')} - {ai.get('title_short') or bill.get('title', '')}\n"
        f"Eveniment: {event['event_type']}\n"
        f"Data votului: {event.get('vote_date') or 'n/a'}\n\n"
        f"Pe scurt:\n{idea_text}\n\n"
        "Nota: CivicMind urmareste momentan date din Camera Deputatilor. "
        "Aceasta notificare nu inseamna neaparat ca legea este adoptata definitiv.\n\n"
        f"Flaguri aplicate: {', '.join(flags)}"
    )


def load_inputs(state: NotificationState) -> dict:
    data_dir = Path(state["data_dir"])
    processed_dir = Path(state["processed_dir"])
    preferences_path = Path(state["preferences_path"])

    bills = [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(data_dir.glob("bill_*.json"))
    ]
    previous_events = _read_json(processed_dir / EVENTS_FILE, [])
    preferences = _load_preferences(preferences_path)

    print(f"  Loaded {len(bills)} bills, {len(previous_events)} prior events, {len(preferences)} notification preferences")
    return {
        "bills": bills,
        "previous_events": previous_events,
        "preferences": preferences,
        "error": None,
    }


def detect_events(state: NotificationState) -> dict:
    if state.get("error"):
        return {}

    seen = {_event_key(event) for event in state.get("previous_events", [])}
    events: list[dict] = []
    detected_at = _now()

    for bill in state["bills"]:
        idp = bill.get("idp")
        base = {
            "idp": idp,
            "bill_number": bill.get("bill_number"),
            "detected_at": detected_at,
            "source": "cdep",
            "chamber": "deputies",
        }

        bill_event = {**base, "event_type": "new_bill"}
        if _event_key(bill_event) not in seen:
            events.append(bill_event)

        if bill.get("ai_analysis"):
            ai_event = {**base, "event_type": "analysis_created"}
            if _event_key(ai_event) not in seen:
                events.append(ai_event)

        for session in bill.get("vote_sessions", []):
            if session.get("type") != "final":
                continue
            vote_event = {
                **base,
                "event_type": "new_final_vote",
                "idv": session.get("idv"),
                "vote_date": session.get("date"),
                "summary": session.get("summary", {}),
            }
            if _event_key(vote_event) not in seen:
                events.append(vote_event)

    print(f"  Detected {len(events)} new event(s)")
    return {"events": events}


def classify_flags(state: NotificationState) -> dict:
    if state.get("error"):
        return {}

    by_idp = {bill["idp"]: bill for bill in state["bills"]}
    flags: dict[str, dict] = {}

    for event in state["events"]:
        bill = by_idp.get(event["idp"], {})
        event_flags = _bill_flags(bill, event)
        importance = _classify_importance(event_flags)
        key = _event_key(event)
        flags[key] = {
            "event_key": key,
            "idp": event["idp"],
            "idv": event.get("idv"),
            "bill_number": event.get("bill_number"),
            "event_type": event["event_type"],
            "importance": importance,
            "flags": event_flags,
            "classified_at": _now(),
        }

    print(f"  Classified flags for {len(flags)} event(s)")
    return {"flags": flags}


def match_preferences(state: NotificationState) -> dict:
    if state.get("error"):
        return {}

    by_idp = {bill["idp"]: bill for bill in state["bills"]}
    existing_jobs = _read_json(Path(state["processed_dir"]) / JOBS_FILE, [])
    existing_job_ids = {job.get("job_id") for job in existing_jobs}
    jobs: list[dict] = []

    for event in state["events"]:
        event_key = _event_key(event)
        flag_record = state["flags"][event_key]
        bill = by_idp.get(event["idp"], {})

        for user in state["preferences"]:
            matched, matched_flags = _matches_preference(
                user,
                flag_record["flags"],
                flag_record["importance"],
            )
            if not matched:
                continue

            user_id = user.get("user_id") or user.get("email")
            job_id = f"{event_key}:{user_id}"
            if job_id in existing_job_ids:
                continue

            jobs.append({
                "job_id": job_id,
                "event_key": event_key,
                "user_id": user_id,
                "email": user.get("email"),
                "status": "queued",
                "frequency": user.get("frequency", "weekly"),
                "importance": flag_record["importance"],
                "matched_flags": matched_flags,
                "subject": _draft_subject(bill, event, flag_record["importance"]),
                "body": _draft_body(user, bill, event, flag_record["flags"]),
                "created_at": _now(),
            })

    print(f"  Queued {len(jobs)} notification job(s)")
    return {"jobs": jobs}


def save_outputs(state: NotificationState) -> dict:
    if state.get("error"):
        print(f"  [NOTIFICATIONS ERROR] {state['error']}")
        return {}

    processed_dir = Path(state["processed_dir"])
    all_events = state.get("previous_events", []) + state.get("events", [])

    previous_flags = _read_json(processed_dir / FLAGS_FILE, {})
    previous_flags.update(state.get("flags", {}))

    previous_jobs = _read_json(processed_dir / JOBS_FILE, [])
    all_jobs = previous_jobs + state.get("jobs", [])

    _write_json(processed_dir / EVENTS_FILE, all_events)
    _write_json(processed_dir / FLAGS_FILE, previous_flags)
    _write_json(processed_dir / JOBS_FILE, all_jobs)

    print(f"  [NOTIFICATIONS OK] {len(state.get('events', []))} events, {len(state.get('jobs', []))} jobs")
    return {}


def build_notifications() -> Any:
    g = StateGraph(NotificationState)
    g.add_node("load_inputs", load_inputs)
    g.add_node("detect_events", detect_events)
    g.add_node("classify_flags", classify_flags)
    g.add_node("match_preferences", match_preferences)
    g.add_node("save_outputs", save_outputs)

    g.set_entry_point("load_inputs")
    g.add_edge("load_inputs", "detect_events")
    g.add_edge("detect_events", "classify_flags")
    g.add_edge("classify_flags", "match_preferences")
    g.add_edge("match_preferences", "save_outputs")
    g.add_edge("save_outputs", END)

    return g.compile()


def run_notifications(
    data_dir: str = "data/raw",
    processed_dir: str = "data/processed",
    preferences_path: str = "data/processed/notification_preferences.json",
) -> dict:
    graph = build_notifications()
    initial: NotificationState = {
        "data_dir": data_dir,
        "processed_dir": processed_dir,
        "preferences_path": preferences_path,
        "bills": [],
        "preferences": [],
        "previous_events": [],
        "events": [],
        "flags": {},
        "jobs": [],
        "error": None,
    }
    return graph.invoke(initial)
