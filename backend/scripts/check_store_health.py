"""Al Haramain — store health check (Phase K).

Hits the running server's /api/health, reports product count / DB status /
admin-config state, samples one real local product asset URL for a 200, and
checks free disk space on the DB's drive. No secrets printed.

Usage:
    python backend/scripts/check_store_health.py
    python backend/scripts/check_store_health.py --base-url http://localhost:8000 --low-space-gb 5
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import httpx

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import catalogue_db  # noqa: E402


def check(base_url: str, low_space_gb: float, timeout: float) -> int:
    ok = True
    print(f"Checking {base_url} ...")

    try:
        r = httpx.get(f"{base_url}/api/health", timeout=timeout)
        r.raise_for_status()
        health = r.json()
    except Exception as exc:
        print(f"[FAIL] /api/health unreachable: {exc}")
        return 1

    print(f"[OK]   /api/health -> status={health.get('status')} version={health.get('version')}")
    print(f"       products={health.get('products')} database={health.get('database')} "
          f"catalogue={health.get('catalogue')} admin_configured={health.get('admin_configured')}")
    if not health.get("database"):
        print("[FAIL] database not OK")
        ok = False
    if not health.get("products"):
        print("[FAIL] product count is 0")
        ok = False
    if not health.get("admin_configured"):
        print("[WARN] admin PIN not configured (expected until an operator runs set_admin_pin.py)")

    # Sample one real local product asset for a 200. Local images live at
    # frontend/public/assets/products/<slug>/thumb.webp regardless of what
    # the DB's primary_image column holds (that column is often a remote
    # provenance URL, not the locally-served path — see catalogue_db.py).
    asset_path = None
    try:
        products_dir = BACKEND_DIR.parent / "frontend" / "public" / "assets" / "products"
        for slug_dir in products_dir.iterdir():
            if slug_dir.is_dir() and (slug_dir / "thumb.webp").exists():
                asset_path = f"/assets/products/{slug_dir.name}/thumb.webp"
                break
    except Exception as exc:
        print(f"[WARN] could not sample a product image from disk: {exc}")

    if asset_path:
        asset_url = base_url.rstrip("/") + asset_path
        try:
            ar = httpx.get(asset_url, timeout=timeout)
            if ar.status_code == 200:
                print(f"[OK]   sample asset 200: {asset_path}")
            else:
                print(f"[FAIL] sample asset {ar.status_code}: {asset_path}")
                ok = False
        except Exception as exc:
            print(f"[FAIL] sample asset request failed: {exc}")
            ok = False
    else:
        print("[WARN] no product image path found to sample")

    # Disk space on the DB's drive.
    try:
        usage = shutil.disk_usage(catalogue_db.DB_PATH.parent)
        free_gb = usage.free / (1024**3)
        if free_gb < low_space_gb:
            print(f"[WARN] low disk space: {free_gb:.1f} GB free (threshold {low_space_gb} GB)")
        else:
            print(f"[OK]   disk space: {free_gb:.1f} GB free")
    except Exception as exc:
        print(f"[WARN] could not check disk space: {exc}")

    print("RESULT:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Check Al Haramain store server health")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--low-space-gb", type=float, default=5.0)
    parser.add_argument("--timeout", type=float, default=5.0)
    args = parser.parse_args()
    sys.exit(check(args.base_url, args.low_space_gb, args.timeout))


if __name__ == "__main__":
    main()
