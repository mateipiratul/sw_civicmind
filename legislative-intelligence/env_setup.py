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


def get_mistral_api_key(raise_error: bool = True) -> str | None:
    """
    Centralized getter and validator for MISTRAL_API_KEY.
    """
    load_project_env()
    key = os.getenv("MISTRAL_API_KEY")
    if not key and raise_error:
        raise RuntimeError("MISTRAL_API_KEY is not set in the environment or .env file")
    return key
