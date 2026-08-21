# Migration convention (Phase K)

## What already existed before Phase K
`backend/scripts/migrate_db.py` — an ad-hoc, idempotent script (uses
`ALTER TABLE ... ` wrapped in try/except and `CREATE TABLE IF NOT EXISTS`) that
added the `origin`/`admin_modified_at`/`deleted_at` columns and the
`admin_credentials` / `admin_sessions` / `audit_log` tables. It has already
been run against `backend/data/alharamain.sqlite` (those tables/columns exist
today). It is **not tracked** in a migrations table — running it again is safe
(everything is IF-NOT-EXISTS / catches the "duplicate column" error) but there
is no record of *when* it ran.

This is "something reasonable already exists" — it is not being replaced, only
documented, per the Phase K instruction not to duplicate an existing
mechanism.

## What Phase K adds
A `schema_migrations` table (created by `catalogue_db.init_catalogue_db()`,
columns: `id`, `filename` UNIQUE, `applied_at`) so **future** migrations can
record that they ran, instead of relying on `IF NOT EXISTS` guesswork.

## Convention for new migrations going forward
1. Add a new file `backend/migrations/NNNN_description.py` (zero-padded,
   4-digit, incrementing — e.g. `0001_add_supplier_field.py`).
2. The file must be idempotent (safe to run twice) and must, on success,
   insert its own filename into `schema_migrations`:
   ```python
   import sqlite3, sys
   from pathlib import Path
   sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
   import catalogue_db as db

   FILENAME = Path(__file__).name

   def run():
       conn = db._connect()
       already = conn.execute(
           "SELECT 1 FROM schema_migrations WHERE filename = ?", (FILENAME,)
       ).fetchone()
       if already:
           print(f"{FILENAME}: already applied, skipping")
           return
       # ... ALTER TABLE / CREATE TABLE statements here ...
       conn.execute(
           "INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)",
           (FILENAME, db._now()),
       )
       conn.commit()
       print(f"{FILENAME}: applied")

   if __name__ == "__main__":
       run()
   ```
3. Run manually: `python backend/migrations/NNNN_description.py` (from repo
   root or `backend/`, both work — the script resolves the DB path via
   `catalogue_db.py`, not CWD).
4. No auto-run-on-startup framework is added — this is a small, documented
   convention, not a migration engine. Keep it that way.
