from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from supabase import Client, create_client

from env_setup import load_project_env

load_project_env()

DATA_RAW = Path("data/raw")
PROFILE_LIST_FIELDS = {
    "roles",
    "interests",
    "affected_profiles",
    "followed_bills",
    "followed_mps",
}

_STATUS_LABELS: dict[str, str] = {
    "la_senat": "La Senat",
    "promulgata": "Promulgată",
    "in_comisie": "În Comisie",
    "respinsa": "Respinsă",
    "adoptata": "Adoptată",
    "in_procedura_legislativa": "În Procedură",
    "retras": "Retras",
}


def _db() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(url, key)


def _as_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _load_bills() -> list[dict]:
    bills = []
    for path in sorted(DATA_RAW.glob("bill_*.json")):
        bills.append(json.loads(path.read_text(encoding="utf-8")))
    return bills


def _get_one(table: str, field: str, value: Any) -> dict | None:
    rows = (
        _db().table(table)
        .select("*")
        .eq(field, value)
        .limit(1)
        .execute()
        .data
    )
    return rows[0] if rows else None


def _normalize_profile_row(row: dict | None) -> dict:
    row = row or {}
    normalized = dict(row)
    for field in PROFILE_LIST_FIELDS:
        normalized[field] = _as_list(normalized.get(field))
    return normalized


def _profile_completion(profile: dict) -> dict:
    fields = [
        "display_name",
        "city",
        "county",
        "occupation",
        "sector",
        "roles",
        "interests",
        "affected_profiles",
    ]
    filled = sum(
        1 for f in fields
        if (lambda v: bool(v))(profile.get(f))
    )
    return {
        "filled_fields": filled,
        "total_fields": len(fields),
        "ratio": round(filled / len(fields), 3),
    }


def _status_label(status: str | None) -> str:
    if not status:
        return "—"
    return _STATUS_LABELS.get(status, status.replace("_", " ").capitalize())


def _build_feed_card(bill: dict, *, personalization: dict | None = None) -> dict:
    ai = bill.get("ai_analysis") or {}
    sessions = bill.get("vote_sessions", [])
    last_session = sessions[-1] if sessions else {}
    key_ideas = ai.get("key_ideas") or []
    card: dict = {
        "idp": bill["idp"],
        "bill_number": bill.get("bill_number"),
        "title": bill.get("title"),
        "title_short": (ai.get("title_short") or bill.get("title", ""))[:160],
        "status": bill.get("status"),
        "status_label": _status_label(bill.get("status")),
        "impact_categories": ai.get("impact_categories", []),
        "affected_profiles": ai.get("affected_profiles", []),
        "controversy_score": ai.get("controversy_score"),
        "passed_by": ai.get("passed_by"),
        "vote_date": ai.get("vote_date") or last_session.get("date"),
        "has_ai_analysis": bool(ai),
        "key_ideas_preview": key_ideas[0][:150] if key_ideas else None,
    }
    if personalization is not None:
        card["personalization"] = personalization
    return card


# ── Profile read / write ──────────────────────────────────────────────────────

def get_user_profile(user_id: str) -> dict:
    user = _get_one("users", "user_id", user_id)
    if not user:
        raise ValueError(f"User {user_id} not found")

    profile = _normalize_profile_row(_get_one("user_profiles", "user_id", user_id))
    notification = _get_one("notification_preferences", "user_id", user_id) or {}

    return {
        "user_id": user["user_id"],
        "email": user.get("email"),
        "full_name": user.get("name"),
        "email_opt_in": bool(user.get("email_opt_in")),
        "profile": {
            "display_name": profile.get("display_name"),
            "auth_provider": profile.get("auth_provider"),
            "city": profile.get("city"),
            "county": profile.get("county"),
            "constituency": profile.get("constituency"),
            "occupation": profile.get("occupation"),
            "sector": profile.get("sector"),
            "roles": profile.get("roles", []),
            "interests": profile.get("interests", []),
            "affected_profiles": profile.get("affected_profiles", []),
            "followed_bills": profile.get("followed_bills", []),
            "followed_mps": profile.get("followed_mps", []),
            "language": profile.get("language") or "ro",
            "explanation_preference": profile.get("explanation_preference") or "brief",
            "onboarding_completed_at": profile.get("onboarding_completed_at"),
            "updated_at": profile.get("updated_at"),
        },
        "notification_preferences": {
            "categories": _as_list(notification.get("categories")),
            "profiles": _as_list(notification.get("profiles")),
            "flags": _as_list(notification.get("flags")),
            "frequency": notification.get("frequency") or "weekly",
            "min_importance": notification.get("min_importance") or "normal",
            "major_alerts": bool(notification.get("major_alerts", True)),
            "updated_at": notification.get("updated_at"),
        },
        "completion": _profile_completion(profile),
    }


def upsert_user_profile(user_id: str, payload: dict) -> dict:
    existing_user = _get_one("users", "user_id", user_id)
    email = payload.get("email") or (existing_user or {}).get("email")
    full_name = payload.get("full_name") or (existing_user or {}).get("name")

    if not email:
        raise ValueError("email is required when creating a new user profile")

    user_row: dict = {"user_id": user_id, "email": email, "name": full_name}
    if "email_opt_in" in payload:
        user_row["email_opt_in"] = bool(payload.get("email_opt_in"))
    _db().table("users").upsert(user_row, on_conflict="user_id").execute()

    profile_payload = payload.get("profile", {})
    profile_row = {
        "user_id": user_id,
        "display_name": profile_payload.get("display_name"),
        "auth_provider": profile_payload.get("auth_provider"),
        "city": profile_payload.get("city"),
        "county": profile_payload.get("county"),
        "constituency": profile_payload.get("constituency"),
        "occupation": profile_payload.get("occupation"),
        "sector": profile_payload.get("sector"),
        "roles": _as_list(profile_payload.get("roles")),
        "interests": _as_list(profile_payload.get("interests")),
        "affected_profiles": _as_list(profile_payload.get("affected_profiles")),
        "followed_bills": _as_list(profile_payload.get("followed_bills")),
        "followed_mps": _as_list(profile_payload.get("followed_mps")),
        "language": profile_payload.get("language") or "ro",
        "explanation_preference": profile_payload.get("explanation_preference") or "brief",
        "onboarding_completed_at": profile_payload.get("onboarding_completed_at"),
    }
    _db().table("user_profiles").upsert(profile_row, on_conflict="user_id").execute()

    notification_payload = payload.get("notification_preferences")
    if notification_payload is not None:
        notification_row = {
            "user_id": user_id,
            "categories": _as_list(notification_payload.get("categories")),
            "profiles": _as_list(notification_payload.get("profiles")),
            "flags": _as_list(notification_payload.get("flags")),
            "frequency": notification_payload.get("frequency") or "weekly",
            "min_importance": notification_payload.get("min_importance") or "normal",
            "major_alerts": bool(notification_payload.get("major_alerts", True)),
        }
        _db().table("notification_preferences").upsert(notification_row, on_conflict="user_id").execute()

    return get_user_profile(user_id)


# ── Follow / unfollow ─────────────────────────────────────────────────────────

def follow_bill(user_id: str, idp: int) -> dict:
    profile = _normalize_profile_row(_get_one("user_profiles", "user_id", user_id))
    followed = {int(x) for x in profile.get("followed_bills", []) if str(x).isdigit()}
    followed.add(idp)
    _db().table("user_profiles").update({"followed_bills": sorted(followed)}).eq("user_id", user_id).execute()
    return {"user_id": user_id, "followed_bills": sorted(followed)}


def unfollow_bill(user_id: str, idp: int) -> dict:
    profile = _normalize_profile_row(_get_one("user_profiles", "user_id", user_id))
    followed = {int(x) for x in profile.get("followed_bills", []) if str(x).isdigit()}
    followed.discard(idp)
    _db().table("user_profiles").update({"followed_bills": sorted(followed)}).eq("user_id", user_id).execute()
    return {"user_id": user_id, "followed_bills": sorted(followed)}


def follow_mp(user_id: str, mp_slug: str) -> dict:
    profile = _normalize_profile_row(_get_one("user_profiles", "user_id", user_id))
    followed = {str(x).casefold() for x in profile.get("followed_mps", [])}
    followed.add(mp_slug.casefold())
    _db().table("user_profiles").update({"followed_mps": sorted(followed)}).eq("user_id", user_id).execute()
    return {"user_id": user_id, "followed_mps": sorted(followed)}


def unfollow_mp(user_id: str, mp_slug: str) -> dict:
    profile = _normalize_profile_row(_get_one("user_profiles", "user_id", user_id))
    followed = {str(x).casefold() for x in profile.get("followed_mps", [])}
    followed.discard(mp_slug.casefold())
    _db().table("user_profiles").update({"followed_mps": sorted(followed)}).eq("user_id", user_id).execute()
    return {"user_id": user_id, "followed_mps": sorted(followed)}


# ── Feed builders ─────────────────────────────────────────────────────────────

def build_personalization_summary(user_id: str, *, limit: int = 10) -> dict:
    profile_bundle = get_user_profile(user_id)
    profile = profile_bundle["profile"]
    interests = {str(item).casefold() for item in profile.get("interests", [])}
    affected_profiles = {str(item).casefold() for item in profile.get("affected_profiles", [])}
    followed_bills = {int(item) for item in profile.get("followed_bills", []) if str(item).isdigit()}
    followed_mps = {str(item).casefold() for item in profile.get("followed_mps", [])}

    recommendations: list[dict] = []
    for bill in _load_bills():
        ai = bill.get("ai_analysis") or {}
        bill_categories = {str(item).casefold() for item in ai.get("impact_categories", [])}
        bill_profiles = {str(item).casefold() for item in ai.get("affected_profiles", [])}
        score = 0
        reasons: list[str] = []

        category_hits = sorted(interests & bill_categories)
        if category_hits:
            score += 3 * len(category_hits)
            reasons.append(f"matches interests: {', '.join(category_hits)}")

        profile_hits = sorted(affected_profiles & bill_profiles)
        if profile_hits:
            score += 2 * len(profile_hits)
            reasons.append(f"matches affected profiles: {', '.join(profile_hits)}")

        if bill["idp"] in followed_bills:
            score += 8
            reasons.append("you already follow this bill")

        latest_votes = bill.get("vote_sessions") or []
        if followed_mps and latest_votes:
            seen_followed = sorted(
                {
                    mv.get("mp_slug", "").casefold()
                    for session in latest_votes[-1:]
                    for mv in session.get("nominal_votes", [])
                    if mv.get("mp_slug", "").casefold() in followed_mps
                }
            )
            if seen_followed:
                score += 2
                reasons.append("followed MPs voted on this bill")

        if not score:
            continue

        personalization = {
            "score": score,
            "why_this_matters_to_you": "; ".join(reasons[:2]),
            "matching_categories": category_hits,
            "matching_profiles": profile_hits,
            "is_followed": bill["idp"] in followed_bills,
            "reasons": reasons,
        }
        recommendations.append(_build_feed_card(bill, personalization=personalization))

    recommendations.sort(key=lambda item: (-item["personalization"]["score"], item.get("bill_number") or ""))
    return {
        "user_id": user_id,
        "profile_signals": {
            "interests": profile.get("interests", []),
            "affected_profiles": profile.get("affected_profiles", []),
            "followed_bills": profile.get("followed_bills", []),
            "followed_mps": profile.get("followed_mps", []),
            "explanation_preference": profile.get("explanation_preference") or "brief",
        },
        "feed_guidance": {
            "ranking_strategy": "interest_profile_follow_v1",
            "summary": "Boost bills that match interests, affected profiles, followed bills, and followed MPs.",
        },
        "recommended_bills": recommendations[:limit],
    }


def build_anonymous_feed(*, limit: int = 20, category: str | None = None) -> dict:
    bills = _load_bills()
    items = []
    for bill in bills:
        ai = bill.get("ai_analysis") or {}
        if category and category.casefold() not in [c.casefold() for c in ai.get("impact_categories", [])]:
            continue
        items.append(_build_feed_card(bill))
    items.sort(
        key=lambda x: (x.get("vote_date") or "", x.get("controversy_score") or 0.0),
        reverse=True,
    )
    return {
        "mode": "anonymous",
        "ranking_strategy": "chronological_v1",
        "total": len(items),
        "items": items[:limit],
    }
