"""Al Haramain — Product Image Localization (Phase I.5).

Downloads all remote product images into local optimized WebP derivatives.
Resumable and idempotent.
"""

from __future__ import annotations

import argparse
import collections
import concurrent.futures
import io
import mimetypes
import os
import sqlite3
import sys
import time
import urllib.request
from pathlib import Path
from urllib.error import URLError

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required. Run: py -m pip install Pillow")

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
ASSETS_DIR = PROJECT_ROOT / "frontend" / "public" / "assets" / "products"
DB_PATH = BACKEND_DIR / "data" / "alharamain.sqlite"

SIZES = {
    "thumb": 240,
    "medium": 600,
    "large": 1200,
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def _connect():
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    return conn


def process_product(pid: int, slug: str, source_url: str, force: bool):
    out_dir = ASSETS_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    
    paths = {
        "thumb": f"/assets/products/{slug}/thumb.webp",
        "medium": f"/assets/products/{slug}/medium.webp",
        "large": f"/assets/products/{slug}/large.webp",
    }
    
    # Check if files already exist
    all_exist = all((PROJECT_ROOT / "frontend" / "public" / p.lstrip("/")).exists() for p in paths.values())
    if all_exist and not force:
        # Update DB and return success
        _update_db(pid, paths, "success", None)
        return "already_local"

    if not source_url or not source_url.startswith("http"):
        _update_db(pid, None, "failed", "missing_url")
        return "missing_url"

    try:
        req = urllib.request.Request(source_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                _update_db(pid, None, "failed", f"invalid_content: {content_type}")
                return "invalid_content"
            
            data = resp.read()
            if not data:
                _update_db(pid, None, "failed", "empty_response")
                return "empty_response"
                
    except URLError as e:
        _update_db(pid, None, "failed", f"http_error: {str(e)}")
        return "http_error"
    except Exception as e:
        _update_db(pid, None, "failed", f"timeout_or_error: {str(e)}")
        return "timeout"

    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)
        
        # Convert to RGB or RGBA depending on transparency
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGBA")
            save_kw = {"format": "WEBP", "lossless": False, "quality": 85}
        else:
            img = img.convert("RGB")
            save_kw = {"format": "WEBP", "quality": 85}
            
        for size_name, max_dim in SIZES.items():
            resized = img.copy()
            resized.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            save_path = PROJECT_ROOT / "frontend" / "public" / paths[size_name].lstrip("/")
            resized.save(save_path, **save_kw)
            
        _update_db(pid, paths, "success", None)
        return "localized"

    except Exception as e:
        _update_db(pid, None, "failed", f"decode_error: {str(e)}")
        return "decode_error"


def _update_db(pid: int, paths: dict | None, status: str, error: str | None):
    with _connect() as conn:
        if paths:
            conn.execute(
                """UPDATE product_images 
                   SET thumb_path = ?, medium_path = ?, large_path = ?, download_status = ?, error = NULL
                   WHERE product_id = ?""",
                (paths["thumb"], paths["medium"], paths["large"], status, pid)
            )
        else:
            conn.execute(
                """UPDATE product_images 
                   SET download_status = ?, error = ?
                   WHERE product_id = ?""",
                (status, error, pid)
            )
        conn.commit()


def run(force=False):
    print("=" * 60)
    print("Al Haramain — Image Localization (Phase I.5)")
    print("=" * 60)

    # Make sure product_images has rows for all products, since the importer might not have
    # added them if the logic missed something, though the audit showed 1468 rows.
    with _connect() as conn:
        rows = conn.execute(
            """SELECT p.id, p.slug, pi.source_url 
               FROM products p
               JOIN product_images pi ON p.id = pi.product_id
               WHERE pi.is_primary = 1"""
        ).fetchall()

    total = len(rows)
    print(f"Products with primary images: {total}")

    stats = collections.Counter()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_product, r["id"], r["slug"], r["source_url"], force): r for r in rows}
        
        completed = 0
        for future in concurrent.futures.as_completed(futures):
            completed += 1
            res = future.result()
            stats[res] += 1
            if completed % 50 == 0 or completed == total:
                print(f"[{completed}/{total}] Progress... (success: {stats['localized'] + stats['already_local']}, failed: {sum(v for k, v in stats.items() if k not in ('localized', 'already_local'))})")

    print("=" * 60)
    print("Final Localization Report:")
    for k, v in stats.most_common():
        print(f"  {k}: {v}")
    
    # Calculate sizes
    assets_size = sum(f.stat().st_size for f in ASSETS_DIR.glob('**/*') if f.is_file())
    print(f"Local assets directory size: {assets_size / (1024*1024):.2f} MB")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Force redownload of all images")
    args = parser.parse_args()
    run(force=args.force)
