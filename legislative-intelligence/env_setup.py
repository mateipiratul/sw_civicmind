from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


def load_project_env() -> None:
    """
    Load env vars from both legislative-intelligence/.env and backend/.env.

    This repo currently keeps AI-provider keys in legislative-intelligence/.env
    and Supabase/Django secrets in backend/.env, so the RAG tooling needs both.
    """
    root = Path(__file__).resolve().parent
    load_dotenv(root / ".env")
    load_dotenv(root.parent / "backend" / ".env")

    if not os.getenv("SUPABASE_KEY") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        os.environ["SUPABASE_KEY"] = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
