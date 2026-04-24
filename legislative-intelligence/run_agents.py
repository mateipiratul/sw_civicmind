"""
CivicMind agent runner.

Usage:
    python run_agents.py --scout              # run Scout on all bills in data/raw/
    python run_agents.py --scout --file bill_23048.json
    python run_agents.py --auditor            # compute Impact Scores for all MPs
    python run_agents.py --notifications      # detect bill events and queue notification jobs
    python run_agents.py --deliver-notifications  # dry-run queued notification jobs
    python run_agents.py --qa --file bill_23048.json
    python run_agents.py --messenger --file bill_23048.json
    python run_agents.py --all                # Scout + Auditor on everything
"""
import argparse
import json
import sys
import io
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

RAW_DIR = Path("data/raw")


def run_scout_all(single_file: str | None = None, workers: int = 4) -> None:
    from agents.scout import run_scout
    files = [RAW_DIR / single_file] if single_file else sorted(RAW_DIR.glob("bill_*.json"))
    print(f"\n[SCOUT] Processing {len(files)} bill(s)...")
    if not files:
        print("[SCOUT] No bill files found.\n")
        return

    if single_file or workers <= 1:
        for path in files:
            print(f"  {path.name}")
            run_scout(str(path))
        print("[SCOUT] Done.\n")
        return

    worker_count = min(workers, 4, len(files))
    print(f"  Using {worker_count} worker(s)")
    with ThreadPoolExecutor(max_workers=worker_count) as pool:
        futures = {pool.submit(run_scout, str(path)): path for path in files}
        for fut in as_completed(futures):
            path = futures[fut]
            try:
                fut.result()
            except Exception as exc:
                print(f"  [SCOUT ERROR] {path.name}: {exc}")
                continue
            print(f"  [SCOUT FILE OK] {path.name}")

    print("[SCOUT] Done.\n")


def run_auditor_all() -> None:
    from agents.auditor import run_auditor
    print("\n[AUDITOR] Computing Impact Scores...")
    run_auditor(str(RAW_DIR))
    print("[AUDITOR] Done.\n")


def run_notifications_all(preferences: str | None = None) -> None:
    from agents.notifications import run_notifications
    print("\n[NOTIFICATIONS] Detecting events and queueing jobs...")
    run_notifications(
        data_dir=str(RAW_DIR),
        processed_dir="data/processed",
        preferences_path=preferences or "data/processed/notification_preferences.json",
    )
    print("[NOTIFICATIONS] Done.\n")


def run_notification_delivery_all(limit: int = 100) -> None:
    from agents.notification_delivery import run_notification_delivery
    print("\n[DELIVERY] Processing queued notification jobs in dry-run mode...")
    run_notification_delivery(processed_dir="data/processed", limit=limit, dry_run=True)
    print("[DELIVERY] Done.\n")


def run_qa_interactive(single_file: str) -> None:
    from agents.qa import run_qa
    path = RAW_DIR / single_file
    bill = json.loads(path.read_text(encoding="utf-8"))

    print(f"\n[Q&A] Bill: {bill.get('bill_number')} — {bill.get('title', '')[:60]}")
    print("Type your question (or 'exit' to quit):\n")

    while True:
        try:
            question = input("Intrebare: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if question.lower() in ("exit", "quit", "q"):
            break
        if not question:
            continue
        print("\nRaspuns:")
        answer = run_qa(bill, question)
        print(answer)
        print()


def run_messenger_interactive(single_file: str) -> None:
    from agents.messenger import run_messenger
    path = RAW_DIR / single_file
    bill = json.loads(path.read_text(encoding="utf-8"))

    print(f"\n[MESSENGER] Bill: {bill.get('bill_number')}")
    mp_name    = input("Numele deputatului: ").strip() or "Domnule Deputat"
    user_name  = input("Numele tau: ").strip() or "Cetatean"
    stance_raw = input("Pozitia ta (support/oppose): ").strip().lower()
    stance     = "support" if stance_raw == "support" else "oppose"

    print("\nGenerez emailul...")
    draft = run_messenger(bill, mp_name, user_name, stance)

    print(f"\nSubiect: {draft.get('subject', '')}")
    print(f"\n{draft.get('body', '')}")


def main() -> None:
    parser = argparse.ArgumentParser(description="CivicMind agent runner")
    parser.add_argument("--scout",     action="store_true")
    parser.add_argument("--auditor",   action="store_true")
    parser.add_argument("--notifications", action="store_true")
    parser.add_argument("--deliver-notifications", action="store_true")
    parser.add_argument("--qa",        action="store_true")
    parser.add_argument("--messenger", action="store_true")
    parser.add_argument("--all",       action="store_true")
    parser.add_argument("--file",      help="Single bill filename in data/raw/")
    parser.add_argument("--workers",   type=int, default=4, help="Max Scout workers; capped at 4")
    parser.add_argument("--preferences", help="Notification preferences JSON path")
    parser.add_argument("--limit", type=int, default=100, help="Delivery job limit")
    args = parser.parse_args()

    if args.all:
        run_scout_all(workers=args.workers)
        run_auditor_all()
        return

    if args.scout:
        run_scout_all(args.file, workers=args.workers)

    if args.auditor:
        run_auditor_all()

    if args.notifications:
        run_notifications_all(args.preferences)

    if args.deliver_notifications:
        run_notification_delivery_all(args.limit)

    if args.qa:
        if not args.file:
            print("--qa requires --file <bill_XXXXX.json>")
            sys.exit(1)
        run_qa_interactive(args.file)

    if args.messenger:
        if not args.file:
            print("--messenger requires --file <bill_XXXXX.json>")
            sys.exit(1)
        run_messenger_interactive(args.file)

    if not any([
        args.scout,
        args.auditor,
        args.notifications,
        args.deliver_notifications,
        args.qa,
        args.messenger,
        args.all,
    ]):
        parser.print_help()


if __name__ == "__main__":
    main()
