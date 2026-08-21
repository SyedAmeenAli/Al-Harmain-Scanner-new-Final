"""Al Haramain — admin session cleanup (Phase K).

Deletes expired or already-revoked rows from admin_sessions. Active,
unexpired sessions are never touched. Safe to run repeatedly (e.g. from a
scheduled task, or manually by an operator) — it is also called once on
every backend startup (see server.py on_startup).

Usage:
    python backend/scripts/cleanup_sessions.py
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import catalogue_db  # noqa: E402


def main() -> None:
    removed = catalogue_db.cleanup_expired_sessions()
    print(f"Removed {removed} expired/revoked admin session(s).")


if __name__ == "__main__":
    main()
