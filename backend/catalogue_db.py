"""Al Haramain — SQLite catalogue store (Phase I).

Local, file-backed catalogue database. No cloud, no external services.
Read by the catalogue REST API; written by scripts/import_catalogue.py.

The schema is intentionally normalized for fast search, note/category
filters, detail pages and related-fragrance matching — while keeping
multi-value fields (notes, categories, sizes, images) in their own tables.

All values come from the source CSV. Fields the source does not contain
are stored as NULL / empty and the frontend already renders honest
incomplete states. Nothing is fabricated here.
"""

from __future__ import annotations

import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

ROOT_DIR = Path(__file__).parent
# Resolved relative to this file (not CWD) so the DB is found regardless of
# where the process is launched from. Override via DATABASE_PATH env var for
# production deployments that want the DB on a different drive/folder.
DB_PATH = Path(os.environ.get("DATABASE_PATH") or (ROOT_DIR / "data" / "alharamain.sqlite")).resolve()

SCHEMA_STATEMENTS = [
    """CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        family TEXT,
        description TEXT,
        price_min INTEGER,
        price_max INTEGER,
        currency TEXT,
        in_stock INTEGER NOT NULL DEFAULT 1,
        is_popular INTEGER NOT NULL DEFAULT 0,
        product_url TEXT,
        primary_image TEXT,
        raw_fragrance_notes TEXT,
        created_at TEXT,
        updated_at TEXT
    )""",
    "CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)",
    "CREATE TABLE IF NOT EXISTS product_categories (product_id INTEGER NOT NULL, category_id INTEGER NOT NULL, PRIMARY KEY (product_id, category_id))",
    "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, display TEXT)",
    "CREATE TABLE IF NOT EXISTS product_notes (product_id INTEGER NOT NULL, note_id INTEGER NOT NULL, layer TEXT, PRIMARY KEY (product_id, note_id, layer))",
    "CREATE TABLE IF NOT EXISTS sizes (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, label TEXT, volume_ml INTEGER, price INTEGER, in_stock INTEGER)",
    "CREATE TABLE IF NOT EXISTS product_images (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, path TEXT, source_url TEXT, is_primary INTEGER, sort_order INTEGER)",
    "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)",
    # Expression index — lets the search fast-path (exact/prefix/substring
    # against lower(name)) use an index scan instead of a full table scan.
    "CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(lower(name))",
    "CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)",
    "CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock)",
    "CREATE INDEX IF NOT EXISTS idx_products_popular ON products(is_popular)",
    "CREATE INDEX IF NOT EXISTS idx_pc_category ON product_categories(category_id)",
    "CREATE INDEX IF NOT EXISTS idx_pn_note ON product_notes(note_id)",
    "CREATE INDEX IF NOT EXISTS idx_sizes_product ON sizes(product_id)",
    "CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id)",
    # Phase K — minimal migration-tracking convention. Scripts under
    # backend/migrations/NNNN_description.py insert their own filename here
    # once applied; init_catalogue_db() only ever creates this table, it does
    # not run migrations itself (see backend/migrations/README.md).
    """CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
    )""",
]


def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9\s-]", "", (text or "").lower())
    text = re.sub(r"\s+", "-", text.strip())
    return text or "product"


def init_catalogue_db() -> None:
    """Create the schema if it does not exist yet."""
    if READ_ONLY_FS:
        # Serverless/read-only deploy: DB ships pre-seeded, nothing to create.
        return
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        for stmt in SCHEMA_STATEMENTS:
            conn.execute(stmt)
        conn.commit()


# Vercel (and other read-only-filesystem serverless platforms) can't open the
# shipped SQLite file read-write — WAL mode needs to create -wal/-shm files
# next to it, and even a plain rw open can fail on a read-only mount. Detect
# that once at import time and fall back to an explicit read-only URI open.
READ_ONLY_FS = bool(os.environ.get("VERCEL") or os.environ.get("READ_ONLY_DB"))


def _connect() -> sqlite3.Connection:
    if READ_ONLY_FS:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro&immutable=1", uri=True)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        return conn
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # Production-sensible pragmas: WAL allows concurrent readers while the
    # admin panel writes; busy_timeout avoids "database is locked" errors
    # under brief write contention instead of failing the request instantly.
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --------------------------------------------------------------------------- #
# Read helpers
# --------------------------------------------------------------------------- #
def _categories_for(conn: sqlite3.Connection, product_id: int) -> list[str]:
    rows = conn.execute(
        """SELECT c.name FROM categories c
           JOIN product_categories pc ON pc.category_id = c.id
           WHERE pc.product_id = ? ORDER BY c.name""",
        (product_id,),
    ).fetchall()
    return [r["name"] for r in rows]


def _notes_for(conn: sqlite3.Connection, product_id: int) -> dict:
    rows = conn.execute(
        """SELECT n.name, n.display, pn.layer FROM notes n
           JOIN product_notes pn ON pn.note_id = n.id
           WHERE pn.product_id = ? ORDER BY pn.layer, n.name""",
        (product_id,),
    ).fetchall()
    out = {"top": [], "heart": [], "base": [], "general": []}
    for r in rows:
        layer = r["layer"] or "general"
        if layer not in out:
            layer = "general"
        label = r["display"] or r["name"]
        out[layer].append(label)
    return out


def _sizes_for(conn: sqlite3.Connection, product_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT label, volume_ml, price, in_stock FROM sizes WHERE product_id = ? ORDER BY id",
        (product_id,),
    ).fetchall()
    return [
        {
            "label": r["label"],
            "volumeMl": r["volume_ml"],
            "price": r["price"],
            "inStock": bool(r["in_stock"]),
        }
        for r in rows
    ]


def _images_for(conn: sqlite3.Connection, product_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT path, source_url, is_primary, sort_order, thumb_path, medium_path, large_path FROM product_images WHERE product_id = ? ORDER BY sort_order, id",
        (product_id,),
    ).fetchall()
    return [
        {
            "path": r["path"],
            "sourceUrl": r["source_url"],
            "isPrimary": bool(r["is_primary"]),
            "sortOrder": r["sort_order"],
            "thumbPath": r["thumb_path"],
            "mediumPath": r["medium_path"],
            "largePath": r["large_path"],
        }
        for r in rows
    ]


def _row_to_product(row: sqlite3.Row, conn: sqlite3.Connection, detailed: bool = False) -> dict:
    pid = row["id"]
    # Notes are always resolved (not gated behind `detailed`) — the bulk list
    # endpoint feeds Finder/ScentOrbit/FragranceDetail directly and they all
    # need real note data, not just the single-product endpoint.
    notes = _notes_for(conn, pid)
    top = notes["top"]
    heart = notes["heart"]
    base = notes["base"]
    general = notes["general"]
    all_notes = (top + heart + base + general)
    in_stock = bool(row["in_stock"])
    is_popular = bool(row["is_popular"])
    if is_popular and in_stock:
        status = "popular"
    elif in_stock:
        status = "inStock"
    else:
        status = "archived"
    product = {
        "id": row["slug"],
        "slug": row["slug"],
        "name": row["name"],
        "type": row["type"],
        "family": row["family"] or "",
        "categories": _categories_for(conn, pid),
        "description": row["description"] or "",
        "priceMin": row["price_min"],
        "priceMax": row["price_max"],
        "currency": row["currency"] or "INR",
        "inStock": in_stock,
        "isPopular": is_popular,
        "status": status,
        "productUrl": row["product_url"] or "",
        "imageUrl": row["primary_image"] or None,
        "primaryImage": row["primary_image"] or None,
        # Flat arrays so the frontend normalizer works unchanged.
        "topNotes": top,
        "middleNotes": heart,
        "baseNotes": base,
        "allNotes": all_notes,
        "notes": {"top": top, "heart": heart, "base": base, "general": general},
        "images": _images_for(conn, pid),
        # Same reasoning as notes above — sizes are needed by list-hydrated
        # customer components, not just the detail endpoint.
        "sizes": _sizes_for(conn, pid),
    }
    if detailed:
        product["rawFragranceNotes"] = row["raw_fragrance_notes"] or ""
    return product


# --------------------------------------------------------------------------- #
# Queries
# --------------------------------------------------------------------------- #
def list_products(
    page: int = 1,
    limit: int = 30,
    category: Optional[str] = None,
    type_: Optional[str] = None,
    note: Optional[str] = None,
    in_stock: Optional[bool] = None,
    sort: str = "name",
    include_deleted: bool = False,
) -> dict:
    page = max(1, page)
    limit = max(1, min(100, limit))
    offset = (page - 1) * limit

    where = []
    if not include_deleted:
        where.append("p.deleted_at IS NULL")
    params: list = []
    if category:
        where.append(
            "p.id IN (SELECT pc.product_id FROM product_categories pc "
            "JOIN categories c ON c.id = pc.category_id WHERE c.name = ?)"
        )
        params.append(category)
    if type_:
        where.append("p.type = ?")
        params.append(type_)
    if in_stock is not None:
        where.append("p.in_stock = ?")
        params.append(1 if in_stock else 0)

    note_join = ""
    if note:
        note_join = (
            "JOIN product_notes pn ON pn.product_id = p.id "
            "JOIN notes n ON n.id = pn.note_id"
        )
        where.append("(n.name = ? OR n.display = ?)")
        params.extend([note, note])

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""

    count_sql = f"SELECT COUNT(*) AS c FROM products p {note_join}{where_sql}"
    with _connect() as conn:
        total = conn.execute(count_sql, params).fetchone()["c"]

        order = {
            "name": "p.name ASC",
            "popular": "p.is_popular DESC, p.name ASC",
            "price_asc": "p.price_min ASC",
            "price_desc": "p.price_max DESC",
        }.get(sort, "p.name ASC")

        data_sql = (
            f"SELECT p.* FROM products p {note_join}{where_sql} "
            f"ORDER BY {order} LIMIT ? OFFSET ?"
        )
        rows = conn.execute(data_sql, params + [limit, offset]).fetchall()
        items = [_row_to_product(r, conn, detailed=False) for r in rows]

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "hasMore": offset + len(items) < total,
    }


def get_product(identifier: str, include_deleted: bool = False) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute(
            f"SELECT * FROM products WHERE (slug = ? OR id = ?) {'AND deleted_at IS NULL' if not include_deleted else ''}", (identifier, identifier)
        ).fetchone()
        if not row:
            # allow numeric id lookup by string
            try:
                row = conn.execute(
                    f"SELECT * FROM products WHERE id = ? {'AND deleted_at IS NULL' if not include_deleted else ''}", (int(identifier),)
                ).fetchone()
            except (ValueError, TypeError):
                row = None
        if not row:
            return None
        return _row_to_product(row, conn, detailed=True)


def related_products(identifier: str, limit: int = 6, include_deleted: bool = False) -> list[dict]:
    product = get_product(identifier, include_deleted=include_deleted)
    if not product:
        return []
    cats = set(product["categories"])
    with _connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM products WHERE slug != ? {'AND deleted_at IS NULL' if not include_deleted else ''}", (product["slug"],)
        ).fetchall()
        scored = []
        for r in rows:
            other = _row_to_product(r, conn, detailed=True)
            score = 0
            shared_cats = cats & set(other["categories"])
            score += 3 * len(shared_cats)
            if product["family"] and product["family"] == other["family"]:
                score += 2
            shared_notes = set(product["allNotes"]) & set(other["allNotes"])
            score += len(shared_notes)
            if other["inStock"]:
                score += 0.5
            if score > 0:
                scored.append((score, other))
        scored.sort(key=lambda x: (-x[0], -int(x[1]["inStock"]), x[1]["name"]))
    return [p for _, p in scored[:limit]]


def list_categories() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT c.name, COUNT(pc.product_id) AS count
               FROM categories c
               LEFT JOIN product_categories pc ON pc.category_id = c.id
               GROUP BY c.id ORDER BY count DESC, c.name"""
        ).fetchall()
    return [{"name": r["name"], "count": r["count"]} for r in rows]


def list_notes() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT n.name, n.display, COUNT(pn.product_id) AS count
               FROM notes n
               LEFT JOIN product_notes pn ON pn.note_id = n.id
               GROUP BY n.id ORDER BY count DESC, n.name"""
        ).fetchall()
    return [
        {"name": r["name"], "display": r["display"] or r["name"], "count": r["count"]}
        for r in rows
    ]


def search_products(q: str, limit: int = 30, category: Optional[str] = None, include_deleted: bool = False) -> list[dict]:
    q_norm = _norm(q)
    if not q_norm:
        return []

    # Tiered candidate selection — SQLite narrows first, Python only ranks a
    # small candidate set, and the expensive fuzzy/Levenshtein pass only
    # runs when the cheap tiers didn't already produce enough matches (a
    # typo query). This replaces the previous "join everything, score all
    # 1468 rows every request" approach.
    deleted_clause = "AND p.deleted_at IS NULL" if not include_deleted else ""
    like_pat = f"%{q_norm}%"

    with _connect() as conn:
        results = []  # (tier, score, product_id)
        seen_ids = set()

        # Tier 1 — name substring/prefix, single indexed column scan, no
        # joins. idx_products_name_lower serves the prefix case directly;
        # the substring case still only scans the name column (cheap vs.
        # the old join-everything pass).
        name_rows = conn.execute(
            f"SELECT p.id, p.name FROM products p WHERE lower(p.name) LIKE ? {deleted_clause}",
            (like_pat,),
        ).fetchall()
        for r in name_rows:
            rank = _rank_name(_norm(r["name"]), q_norm)
            if rank:
                results.append((rank[0], rank[1], r["id"]))
                seen_ids.add(r["id"])

        # Tier 2 — note/category exact-ish match, via the existing
        # product_notes(note_id)/product_categories(category_id) indexes.
        # Small tables (dozens of rows), so scanning notes/categories by
        # name is cheap; the join back to products uses an index.
        meta_sql = f"""
            SELECT DISTINCT p.id
            FROM products p
            JOIN product_notes pn ON pn.product_id = p.id
            JOIN notes n ON n.id = pn.note_id
            WHERE (lower(n.name) LIKE ? OR lower(COALESCE(n.display, '')) LIKE ?) {deleted_clause}
        """
        for r in conn.execute(meta_sql, (like_pat, like_pat)).fetchall():
            if r["id"] not in seen_ids:
                results.append((6, 120, r["id"]))
                seen_ids.add(r["id"])

        cat_sql = f"""
            SELECT DISTINCT p.id
            FROM products p
            JOIN product_categories pc ON pc.product_id = p.id
            JOIN categories c ON c.id = pc.category_id
            WHERE lower(c.name) LIKE ? {deleted_clause}
        """
        for r in conn.execute(cat_sql, (like_pat,)).fetchall():
            if r["id"] not in seen_ids:
                results.append((6, 120, r["id"]))
                seen_ids.add(r["id"])

        # Tier 3 — fuzzy/typo fallback. Only runs when the cheap tiers
        # didn't already find enough candidates, and only compares against
        # names (fuzzy note/category matching wasn't part of the original
        # ranking tiers either). This is the one pass that touches every
        # row, but only for queries that actually need it.
        if len(results) < limit:
            all_rows = conn.execute(
                f"SELECT p.id, p.name FROM products p WHERE 1=1 {deleted_clause}"
            ).fetchall()
            for r in all_rows:
                if r["id"] in seen_ids:
                    continue
                rank = _rank_name(_norm(r["name"]), q_norm)
                if rank:
                    results.append((rank[0], rank[1], r["id"]))
                    seen_ids.add(r["id"])

        # Category filter (post-hoc, only on the small candidate set) and
        # final ranking/limit.
        if category:
            cat_l = category.lower()
            keep_ids = {
                r["id"]
                for r in conn.execute(
                    "SELECT p.id FROM products p JOIN product_categories pc ON pc.product_id = p.id "
                    "JOIN categories c ON c.id = pc.category_id WHERE lower(c.name) = ?",
                    (cat_l,),
                ).fetchall()
            }
            results = [row for row in results if row[2] in keep_ids]

        results.sort(key=lambda x: (x[0], -x[1]))
        top_ids = [pid for _, _, pid in results[:limit]]

        # Full product shape only for the matches actually being returned.
        id_rows = {row["id"]: row for row in conn.execute("SELECT * FROM products WHERE id IN ({})".format(
            ",".join("?" * len(top_ids))
        ), top_ids).fetchall()} if top_ids else {}
        products_by_id = {pid: _row_to_product(id_rows[pid], conn, detailed=False) for pid in top_ids if pid in id_rows}

    return [products_by_id[pid] for pid in top_ids if pid in products_by_id]


# --------------------------------------------------------------------------- #
# Lightweight ranking (mirrors the frontend Phase F tiers)
# --------------------------------------------------------------------------- #
def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9\s]", " ", (s or "").lower()).strip()


def _levenshtein(a: str, b: str) -> int:
    m, n = len(a), len(b)
    if not m:
        return n
    if not n:
        return m
    prev = list(range(n + 1))
    for i in range(1, m + 1):
        curr = [i] + [0] * n
        for j in range(1, n + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        prev = curr
    return prev[n]


def _rank_name(name_n: str, q: str):
    if not name_n:
        return None
    if name_n == q:
        return (1, 1000)
    if name_n.startswith(q):
        return (2, 820 - (len(name_n) - len(q)))
    d = _levenshtein(name_n, q)
    tol = max(1, round(max(len(name_n), len(q)) * 0.25))
    if d <= tol:
        return (3, 620 - d * 18)
    if q in name_n:
        return (4, 430)
    return None


# --------------------------------------------------------------------------- #
# Health / admin-config status (Phase K)
# --------------------------------------------------------------------------- #
def get_health_info() -> dict:
    """Live counts used by /api/health and check_store_health.py. No paths,
    no secrets — safe to expose publicly on the LAN."""
    with _connect() as conn:
        products = conn.execute(
            "SELECT COUNT(*) AS c FROM products WHERE deleted_at IS NULL"
        ).fetchone()["c"]
        try:
            admin_configured = conn.execute(
                "SELECT COUNT(*) AS c FROM admin_credentials"
            ).fetchone()["c"] > 0
        except sqlite3.OperationalError:
            # admin_credentials table not migrated yet on a fresh checkout.
            admin_configured = False
    return {"products": products, "admin_configured": admin_configured}


def cleanup_expired_sessions() -> int:
    """Delete admin sessions that are expired or already revoked. Active,
    unexpired sessions are never touched. Returns number of rows removed."""
    with _connect() as conn:
        try:
            cur = conn.execute(
                "DELETE FROM admin_sessions WHERE revoked_at IS NOT NULL OR expires_at < ?",
                (_now(),),
            )
            conn.commit()
            return cur.rowcount
        except sqlite3.OperationalError:
            return 0
