"""Al Haramain — SQLite catalogue backup (Phase K).

Uses SQLite's online backup API (sqlite3.Connection.backup()), which is safe
to run against a live WAL database (unlike a raw file copy, which can grab a
DB file mid-write and produce a corrupt backup). Writes a timestamped .sqlite
file to a configurable directory and retains only the most recent N backups.

Usage:
    python backend/scripts/backup_catalogue.py
    python backend/scripts/backup_catalogue.py --dest D:/backups --retain 30
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import catalogue_db  # noqa: E402

DEFAULT_RETENTION = int(os.environ.get("BACKUP_RETENTION", "14"))


def backup_once(dest_dir: Path, retain: int) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    source_path = catalogue_db.DB_PATH
    if not source_path.exists():
        raise SystemExit(f"Source database not found: {source_path}")

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_path = dest_dir / f"alharamain-{ts}.sqlite"

    src = sqlite3.connect(str(source_path))
    dst = sqlite3.connect(str(out_path))
    try:
        src.backup(dst)  # online backup API — safe against a live WAL writer
    finally:
        dst.close()
        src.close()

    _prune(dest_dir, retain)
    return out_path


def _prune(dest_dir: Path, retain: int) -> None:
    backups = sorted(
        dest_dir.glob("alharamain-*.sqlite"), key=lambda p: p.stat().st_mtime, reverse=True
    )
    for stale in backups[retain:]:
        try:
            stale.unlink()
        except OSError:
            pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Backup the Al Haramain catalogue SQLite DB")
    parser.add_argument(
        "--dest",
        default=str(BACKEND_DIR / "backups"),
        help="Destination directory for backups (default: backend/backups/)",
    )
    parser.add_argument(
        "--retain",
        type=int,
        default=DEFAULT_RETENTION,
        help=f"Number of most-recent backups to keep (default: {DEFAULT_RETENTION}, "
        "or BACKUP_RETENTION env var)",
    )
    args = parser.parse_args()

    dest_dir = Path(args.dest).resolve()
    out_path = backup_once(dest_dir, args.retain)
    size_kb = out_path.stat().st_size / 1024
    print(f"Backup written: {out_path} ({size_kb:.1f} KB)")

    remaining = sorted(dest_dir.glob("alharamain-*.sqlite"))
    print(f"Backups retained: {len(remaining)} (limit {args.retain})")


if __name__ == "__main__":
    main()
