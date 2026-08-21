"""Al Haramain — deterministic catalogue importer (Phase I).

Reads the authoritative source CSV, normalizes it, and writes it into the
local SQLite catalogue store. Safe to re-run: the catalogue tables are
replaced inside a single transaction, so re-running never accumulates
duplicate products.

Source strategy
---------------
1. Primary: backend/seed_data/al_haramain_catalogue_full.csv
   (1468 products with notes, description, sizes, prices, images,
    categories, is_popular, product_url).
2. Fallback: backend/seed_data/products.csv (sparse 204-row export).

CSV columns (full export):
  name, categories, fragrance_notes, description, sizes,
  price_min, price_max, currency, in_stock, product_url,
  image_url, is_popular

Nothing is invented. Fields the source does not contain are stored as
NULL / empty so the frontend can render honest incomplete states.
"""

from __future__ import annotations

import csv
import os
import re
import sqlite3
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import catalogue_db  # noqa: E402

SEED_DIR = BACKEND_DIR / "seed_data"
FULL_CSV = SEED_DIR / "al_haramain_catalogue_full.csv"
SIMPLE_CSV = SEED_DIR / "products.csv"


# --------------------------------------------------------------------------- #
# Parsing helpers
# --------------------------------------------------------------------------- #
def norm_key(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def split_list(v: str):
    if not v:
        return []
    return [p.strip() for p in re.split(r"[,;|/]", v) if p.strip()]


def to_int(v):
    if v is None or str(v).strip() == "":
        return None
    m = re.search(r"\d+", str(v))
    return int(m.group()) if m else None


def clean_fragrance_notes(raw: str) -> str:
    """Extract just the structured notes portion, stripping any trailing
    description text that got concatenated into the fragrance_notes field.

    Handles pipe-separated format:
      'Top: Bergamot | Middle: Lavender | Base: Woody Notes The fragrance...'
    Returns:
      'Top: Bergamot | Middle: Lavender | Base: Woody Notes'
    """
    text = (raw or "").strip()
    if not text:
        return ""
    # If the field has Top/Middle/Base structure, extract up to the last
    # layer keyword's notes, stopping before any prose that follows.
    m = re.search(
        r"(Top\s*[:\-].*?)(?:\s+(?:The |This |A |An |It |Its |Al |V\.|Created |A |For ))",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        return m.group(1).strip()
    return text


def parse_notes(raw: str):
    """Parse fragrance notes from the raw field.

    Supports two formats:
    1. Pipe-separated: 'Top: Bergamot | Middle: Lavender | Base: Woody Notes'
    2. Block format with newlines (legacy)
    """
    text = clean_fragrance_notes(raw)
    out = {"top": [], "heart": [], "base": [], "general": []}
    if not text:
        return out, raw or ""

    # Check for pipe-separated format first (most common in full CSV)
    if "|" in text and re.search(r"\b(Top|Middle|Base|Heart)\s*[:\-]", text, re.IGNORECASE):
        # Split by pipe, then parse each segment
        segments = [s.strip() for s in text.split("|") if s.strip()]
        for seg in segments:
            m = re.match(r"(Top|Middle|Heart|Base)\s*[:\-]\s*(.*)", seg, re.IGNORECASE | re.DOTALL)
            if m:
                layer = m.group(1).lower()
                if layer == "middle":
                    layer = "heart"
                notes_text = m.group(2).strip()
                out[layer] = split_list(notes_text)
        return out, raw or ""

    # Block format with newlines (legacy)
    block = lambda label: re.search(
        rf"{label}\s*[:\-]\s*([\s\S]*?)(?=\n\s*(?:Top|Middle|Heart|Base)\s*[:\-]|$)",
        text,
        re.IGNORECASE,
    )
    if re.search(r"\b(Top|Middle|Base|Heart)\s*[:\-]", text, re.IGNORECASE):
        top = block("Top")
        middle = block("Middle") or block("Heart")
        base = block("Base")
        out["top"] = split_list(top.group(1)) if top else []
        out["heart"] = split_list(middle.group(1)) if middle else []
        out["base"] = split_list(base.group(1)) if base else []
    else:
        out["general"] = split_list(text)
    return out, raw or ""


def parse_sizes(raw: str, in_stock: bool):
    sizes = []
    for token in split_list(raw):
        vol = None
        m = re.search(r"(\d+)\s*(ml|g)", token, re.IGNORECASE)
        if m:
            vol = int(m.group(1))
        sizes.append(
            {
                "label": token,
                "volume_ml": vol,
                "price": None,
                "in_stock": 1 if in_stock else 0,
            }
        )
    return sizes


def load_enrichment():
    """products.csv → {normalized_name: {family, is_popular}}."""
    out = {}
    if not SIMPLE_CSV.exists():
        return out
    with SIMPLE_CSV.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            name = (row.get("Product Name") or "").strip()
            if not name:
                continue
            status = (row.get("Status") or "").strip().upper()
            out[norm_key(name)] = {
                "family": (row.get("Scent Family") or "").strip(),
                "is_popular": status == "BEST SELLER",
            }
    return out


def read_full_rows():
    if not FULL_CSV.exists():
        return None
    with FULL_CSV.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def read_simple_rows_as_full():
    """Fallback: map products.csv columns onto the full schema shape."""
    rows = []
    with SIMPLE_CSV.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            name = (row.get("Product Name") or "").strip()
            cat = (row.get("Category") or "").strip()
            family = (row.get("Scent Family") or "").strip()
            status = (row.get("Status") or "").strip().upper()
            pmin, pmax = _price_range(row.get("Price Range (₹)") or "")
            rows.append(
                {
                    "name": name,
                    "categories": cat,
                    "fragrance_notes": "",
                    "description": "",
                    "sizes": "",
                    "price_min": str(pmin) if pmin else "",
                    "price_max": str(pmax) if pmax else "",
                    "currency": "INR",
                    "in_stock": "true" if status != "SOLD OUT" else "false",
                    "product_url": "",
                    "image_url": "",
                    "is_popular": "true" if status == "BEST SELLER" else "false",
                    "_family": family,
                }
            )
    return rows


def _price_range(raw: str):
    nums = re.findall(r"\d+", raw or "")
    if len(nums) >= 2:
        return int(nums[0]), int(nums[-1])
    if nums:
        return int(nums[0]), int(nums[0])
    return None, None


# --------------------------------------------------------------------------- #
# Import
# --------------------------------------------------------------------------- #
import argparse
import datetime
import shutil

def backup_db():
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = BACKEND_DIR / "data" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / f"alharamain_pre_reset_{ts}.sqlite"
    shutil.copy(BACKEND_DIR / "data" / "alharamain.sqlite", backup_path)
    print(f"Backup created at: {backup_path}")

def run(force_reseed=False):
    if force_reseed:
        print("WARNING: Performing destructive reseed.")
        backup_db()
        
    catalogue_db.init_catalogue_db()
    conn = catalogue_db._connect()
    conn.execute("PRAGMA foreign_keys=ON")

    enrichment = load_enrichment()
    rows = read_full_rows()
    source = FULL_CSV.name
    if rows is None:
        rows = read_simple_rows_as_full()
        source = SIMPLE_CSV.name

    # Deterministically sort to ensure stable slug allocation for duplicate names
    def sort_key(raw):
        name = (raw.get("name") or "").strip().lower()
        sizes = (raw.get("sizes") or "").strip().lower()
        pmin = to_int(raw.get("price_min")) or 0
        return (name, sizes, pmin)
    
    rows.sort(key=sort_key)

    stats = {
        "found": 0,
        "imported_new": 0,
        "updated": 0,
        "preserved_admin": 0,
        "skipped": 0,
        "skipped_reasons": {},
    }

    now = catalogue_db._now()
    
    # Load existing products to know what to preserve/update
    existing = conn.execute("SELECT id, slug, origin, admin_modified_at FROM products").fetchall()
    existing_by_slug = {r['slug']: r for r in existing}
    
    seen_slugs = set()
    slug_by_name = {}

    try:
        conn.execute("BEGIN")
        if force_reseed:
            conn.execute("DELETE FROM product_notes")
            conn.execute("DELETE FROM product_categories")
            conn.execute("DELETE FROM sizes")
            conn.execute("DELETE FROM product_images")
            conn.execute("DELETE FROM products")
            conn.execute("DELETE FROM notes")
            conn.execute("DELETE FROM categories")
            existing_by_slug = {}

        cat_id_cache = {}
        def _get_cat_id(c_name):
            if c_name not in cat_id_cache:
                conn.execute("INSERT INTO categories (name) VALUES (?) ON CONFLICT(name) DO NOTHING", (c_name,))
                cat_id_cache[c_name] = conn.execute("SELECT id FROM categories WHERE name = ?", (c_name,)).fetchone()["id"]
            return cat_id_cache[c_name]
            
        note_id_cache = {}
        def _get_note_id(n_name, n_display):
            if n_name not in note_id_cache:
                conn.execute("INSERT INTO notes (name, display) VALUES (?, ?) ON CONFLICT(name) DO NOTHING", (n_name, n_display))
                note_id_cache[n_name] = conn.execute("SELECT id FROM notes WHERE name = ?", (n_name,)).fetchone()["id"]
            return note_id_cache[n_name]

        for raw in rows:
            stats["found"] += 1
            name = (raw.get("name") or "").strip()
            if not name:
                stats["skipped"] += 1
                stats["skipped_reasons"]["missing name"] = stats["skipped_reasons"].get("missing name", 0) + 1
                continue

            slug = catalogue_db.slugify(name)
            base = slug
            n = 2
            while slug in seen_slugs:
                slug = f"{base}-{n}"
                n += 1
            seen_slugs.add(slug)
            slug_by_name[name] = slug
            
            cats = split_list(raw.get("categories") or "")
            description = (raw.get("description") or "").strip() or None
            raw_notes = (raw.get("fragrance_notes") or "").strip() or None
            parsed, _ = parse_notes(raw_notes)
            in_stock = str(raw.get("in_stock", "")).strip().lower() in ("true", "1", "yes")
            sizes = parse_sizes(raw.get("sizes") or "", in_stock)
            price_min = to_int(raw.get("price_min"))
            price_max = to_int(raw.get("price_max"))
            currency = (raw.get("currency") or "INR").strip() or "INR"
            product_url = (raw.get("product_url") or "").strip() or None
            primary_image = (raw.get("image_url") or "").strip() or None
            is_popular = str(raw.get("is_popular", "")).strip().lower() in ("true", "1", "yes")

            enrich = enrichment.get(norm_key(name), {})
            family = enrich.get("family") or (raw.get("_family") or "").strip() or None
            if not is_popular:
                is_popular = bool(enrich.get("is_popular", False))
            type_ = cats[0] if cats else None

            # Check if exists and if we should preserve it
            existing_prod = existing_by_slug.get(slug)
            if existing_prod and not force_reseed:
                if existing_prod['origin'] == 'admin' or existing_prod['admin_modified_at'] is not None:
                    stats["preserved_admin"] += 1
                    continue
            
            # Insert or Update
            if not existing_prod or force_reseed:
                conn.execute(
                    """INSERT INTO products
                       (slug, name, type, family, description, price_min,
                        price_max, currency, in_stock, is_popular, product_url,
                        primary_image, raw_fragrance_notes, created_at, updated_at, origin)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (slug, name, type_, family, description, price_min, price_max, currency, 
                     1 if in_stock else 0, 1 if is_popular else 0, product_url, primary_image, raw_notes, now, now, 'import')
                )
                pid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                stats["imported_new"] += 1
            else:
                pid = existing_prod['id']
                conn.execute(
                    """UPDATE products SET
                       name=?, type=?, family=?, description=?, price_min=?,
                        price_max=?, currency=?, in_stock=?, is_popular=?, product_url=?,
                        primary_image=?, raw_fragrance_notes=?, updated_at=?, origin=?
                       WHERE id=?""",
                    (name, type_, family, description, price_min, price_max, currency, 
                     1 if in_stock else 0, 1 if is_popular else 0, product_url, primary_image, raw_notes, now, 'import', pid)
                )
                # clear old related data (but preserve images!)
                conn.execute("DELETE FROM product_categories WHERE product_id=?", (pid,))
                conn.execute("DELETE FROM product_notes WHERE product_id=?", (pid,))
                conn.execute("DELETE FROM sizes WHERE product_id=?", (pid,))
                stats["updated"] += 1
            
            # insert relations
            for c in cats:
                conn.execute("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)", (pid, _get_cat_id(c)))
            
            for note in parsed["top"]:
                conn.execute("INSERT OR IGNORE INTO product_notes (product_id, note_id, layer) VALUES (?, ?, ?)", (pid, _get_note_id(norm_key(note), note), 'top'))
            for note in parsed["heart"]:
                conn.execute("INSERT OR IGNORE INTO product_notes (product_id, note_id, layer) VALUES (?, ?, ?)", (pid, _get_note_id(norm_key(note), note), 'heart'))
            for note in parsed["base"]:
                conn.execute("INSERT OR IGNORE INTO product_notes (product_id, note_id, layer) VALUES (?, ?, ?)", (pid, _get_note_id(norm_key(note), note), 'base'))
            for note in parsed["general"]:
                conn.execute("INSERT OR IGNORE INTO product_notes (product_id, note_id, layer) VALUES (?, ?, ?)", (pid, _get_note_id(norm_key(note), note), 'general'))
            
            for s in sizes:
                conn.execute("INSERT INTO sizes (product_id, label, volume_ml, price, in_stock) VALUES (?,?,?,?,?)", (pid, s["label"], s["volume_ml"], s["price"], s["in_stock"]))
            
            # images (only if new or if not existing in product_images already)
            has_images = conn.execute("SELECT COUNT(*) FROM product_images WHERE product_id=?", (pid,)).fetchone()[0] > 0
            if primary_image and (not has_images or force_reseed):
                conn.execute("INSERT INTO product_images (product_id, source_url, is_primary, sort_order) VALUES (?,?,?,?)", (pid, primary_image, 1, 0))

        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    finally:
        conn.close()

    print("=" * 60)
    print("Al Haramain — non-destructive catalogue import")
    print("=" * 60)
    print(f"Source file            : {source}")
    print(f"Rows found             : {stats['found']}")
    print(f"New inserted           : {stats['imported_new']}")
    print(f"Updated                : {stats['updated']}")
    print(f"Preserved Admin-edited : {stats['preserved_admin']}")
    print(f"Rows skipped           : {stats['skipped']}")
    for reason, count in stats["skipped_reasons"].items():
        print(f"   - {reason}: {count}")
    print("=" * 60)
    print("Import complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force-reseed", action="store_true", help="Destructive reseed (wipes admin edits)")
    args = parser.parse_args()
    run(force_reseed=args.force_reseed)
