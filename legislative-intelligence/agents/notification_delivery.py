"""
Notification delivery worker.

Processes queued notification jobs into a local dry-run outbox. This is the
safe pre-email-provider step: it updates job status and writes delivery logs,
but does not send real email.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

JOBS_FILE = "notification_jobs.json"
DELIVERIES_FILE = "notification_deliveries.json"
OUTBOX_FILE = "notification_outbox.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def run_notification_delivery(
    processed_dir: str = "data/processed",
    limit: int = 100,
    dry_run: bool = True,
) -> dict:
    if not dry_run:
        raise RuntimeError("Real email delivery is not implemented yet. Run with dry_run=True.")

    processed_path = Path(processed_dir)
    jobs_path = processed_path / JOBS_FILE
    deliveries_path = processed_path / DELIVERIES_FILE
    outbox_path = processed_path / OUTBOX_FILE

    jobs = _read_json(jobs_path, [])
    deliveries = _read_json(deliveries_path, [])
    outbox = _read_json(outbox_path, [])

    queued = [job for job in jobs if job.get("status") == "queued"][:limit]
    delivered_at = _now()
    delivery_records = []
    outbox_records = []

    for job in queued:
        job["status"] = "sent_dry_run"
        job["queued_at"] = job.get("queued_at") or job.get("created_at")
        job["sent_at"] = delivered_at

        delivery = {
            "delivery_id": f"dry-run:{job['job_id']}:{delivered_at}",
            "job_id": job["job_id"],
            "provider": "dry_run",
            "provider_message_id": None,
            "status": "sent_dry_run",
            "delivered_at": delivered_at,
            "error": None,
            "created_at": delivered_at,
        }
        delivery_records.append(delivery)
        outbox_records.append({
            "job_id": job["job_id"],
            "email": job.get("email"),
            "subject": job.get("subject"),
            "body": job.get("body"),
            "created_at": delivered_at,
        })

    _write_json(jobs_path, jobs)
    _write_json(deliveries_path, deliveries + delivery_records)
    _write_json(outbox_path, outbox + outbox_records)

    print(f"  [DELIVERY OK] {len(delivery_records)} dry-run deliveries")
    return {
        "processed": len(delivery_records),
        "remaining_queued": sum(1 for job in jobs if job.get("status") == "queued"),
        "dry_run": dry_run,
    }
