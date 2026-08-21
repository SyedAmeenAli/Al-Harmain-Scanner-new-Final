from fastapi import APIRouter, Depends, HTTPException, Response, Request, UploadFile, File
from fastapi.security import APIKeyCookie
from pydantic import BaseModel
import sqlite3
import bcrypt
import secrets
import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
import os
import io

import catalogue_db

logger = logging.getLogger("alharamain.admin")

# Read-only Vercel deploys (catalogue_db.READ_ONLY_FS) can't INSERT/UPDATE a
# session row — SQLite is opened file:...?mode=ro there. Session auth falls
# back to a stateless signed cookie (expiry + HMAC, no DB row) ONLY on that
# path; local/LAN production keeps the existing DB-tracked session exactly
# as-is (revocable via logout, visible in admin_sessions). Needs a stable
# secret shared across all serverless instances, so it must come from env —
# never generated at import time (each cold-started instance would mint a
# different one and reject every other instance's cookies).
ADMIN_SESSION_SECRET = os.environ.get("ADMIN_SESSION_SECRET", "")


def _sign_stateless_session(expires_at: datetime) -> str:
    payload = str(int(expires_at.timestamp()))
    sig = hmac.new(ADMIN_SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def _verify_stateless_session(token: str) -> bool:
    if not ADMIN_SESSION_SECRET:
        return False
    try:
        payload, sig = token.rsplit(".", 1)
        expected = hmac.new(ADMIN_SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        return datetime.now(timezone.utc).timestamp() < int(payload)
    except (ValueError, TypeError):
        return False

# COOKIE_SECURE=true requires HTTPS (browsers silently drop Secure cookies
# over plain HTTP). Default false so HTTP-on-isolated-LAN — the documented
# production mode for this store, see deployment/README.md — works out of
# the box. Set COOKIE_SECURE=true only once the store terminates real TLS.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").strip().lower() == "true"
# Split-origin deploys (frontend and backend on different domains, e.g. two
# separate Vercel projects) need SameSite=None for the browser to send the
# session cookie on cross-origin fetches at all — Lax/Strict only ever ride
# along on same-site requests. None requires Secure=true (enforced by
# browsers), so this is opt-in via env, not a silent default change; the
# documented same-origin/LAN production mode keeps "lax".
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax").strip().lower()
ADMIN_SESSION_HOURS = int(os.environ.get("ADMIN_SESSION_HOURS", "12"))

try:
    from PIL import Image, ImageOps
except ImportError:
    pass # we checked it in Phase I.5

router = APIRouter(prefix="/api/admin", tags=["admin"])

cookie_sec = APIKeyCookie(name="admin_session", auto_error=False)

def get_db():
    conn = catalogue_db._connect()
    try:
        yield conn
    finally:
        conn.close()

# In-memory rate limiting dict: { ip: [timestamps] }
rate_limits = {}

def check_rate_limit(ip: str):
    now = datetime.now(timezone.utc)
    attempts = rate_limits.get(ip, [])
    # Keep attempts from last 5 mins
    attempts = [t for t in attempts if (now - t) < timedelta(minutes=5)]
    if len(attempts) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    attempts.append(now)
    rate_limits[ip] = attempts

def get_admin(request: Request, session_token: str = Depends(cookie_sec), conn: sqlite3.Connection = Depends(get_db)):
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        origin = request.headers.get("origin")
        referer = request.headers.get("referer", "")
        # TRUSTED_ADMIN_ORIGINS, if set, takes precedence over CORS_ORIGINS for
        # this CSRF origin check (same-origin production deploys need only the
        # host_url appended below; TRUSTED_ADMIN_ORIGINS exists for the rarer
        # case of an admin panel served from a different origin than the API).
        trusted_env = os.environ.get("TRUSTED_ADMIN_ORIGINS") or os.environ.get(
            "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        )
        trusted = trusted_env.split(",")
        host_url = f"{request.url.scheme}://{request.url.netloc}"
        trusted.append(host_url)
        
        is_valid = False
        for t in trusted:
            if (origin and origin.startswith(t)) or (referer and referer.startswith(t)):
                is_valid = True
                break
        if not is_valid:
            raise HTTPException(status_code=403, detail="CSRF origin rejected")

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if catalogue_db.READ_ONLY_FS:
        if not _verify_stateless_session(session_token):
            raise HTTPException(status_code=401, detail="Invalid session")
        return True

    token_hash = hashlib.sha256(session_token.encode()).hexdigest()

    row = conn.execute("SELECT * FROM admin_sessions WHERE token_hash = ? AND revoked_at IS NULL", (token_hash,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = datetime.fromisoformat(row["expires_at"])
    now = datetime.now(timezone.utc)
    if now > expires_at:
        raise HTTPException(status_code=401, detail="Session expired")

    conn.execute("UPDATE admin_sessions SET last_seen_at = ? WHERE id = ?", (now.isoformat(), row["id"]))
    conn.commit()
    return True

class LoginRequest(BaseModel):
    pin: str

@router.post("/auth/login")
def login(req: LoginRequest, request: Request, response: Response, conn: sqlite3.Connection = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    check_rate_limit(ip)
    
    admin_row = conn.execute("SELECT * FROM admin_credentials LIMIT 1").fetchone()
    if not admin_row:
        logger.warning("Admin login attempt while unconfigured (ip=%s)", ip)
        raise HTTPException(status_code=503, detail="admin_not_configured")

    if not bcrypt.checkpw(req.pin.encode('utf-8'), admin_row["pin_hash"].encode('utf-8')):
        logger.warning("Admin login failed: invalid PIN (ip=%s)", ip)
        raise HTTPException(status_code=401, detail="Invalid PIN")

    # Clear rate limit on success
    rate_limits.pop(ip, None)

    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=ADMIN_SESSION_HOURS)

    if catalogue_db.READ_ONLY_FS:
        if not ADMIN_SESSION_SECRET:
            logger.error("READ_ONLY_FS but ADMIN_SESSION_SECRET is unset — refusing to mint an unsigned session")
            raise HTTPException(status_code=503, detail="admin_session_secret_not_configured")
        # No DB write available — stateless signed cookie carries its own
        # expiry, nothing to INSERT.
        raw_token = _sign_stateless_session(expires)
    else:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        conn.execute(
            "INSERT INTO admin_sessions (token_hash, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?)",
            (token_hash, now.isoformat(), expires.isoformat(), now.isoformat())
        )
        conn.commit()
    logger.info("Admin login succeeded (ip=%s)", ip)  # never logs the PIN or token

    response.set_cookie(
        key="admin_session",
        value=raw_token,
        httponly=True,
        samesite=COOKIE_SAMESITE, # "lax" same-origin/LAN default; "none" (+ COOKIE_SECURE=true) for split-origin deploys.
        secure=COOKIE_SECURE,  # env-controlled: false = supported HTTP-on-LAN mode, true = requires real HTTPS
        max_age=ADMIN_SESSION_HOURS * 60 * 60
    )
    return {"status": "ok"}

@router.post("/auth/logout")
def logout(response: Response, session_token: str = Depends(cookie_sec), conn: sqlite3.Connection = Depends(get_db)):
    if session_token and not catalogue_db.READ_ONLY_FS:
        # Stateless sessions (read-only path) can't be individually revoked
        # without a DB row — they simply expire (ADMIN_SESSION_HOURS).
        # Deleting the cookie below still logs this browser out immediately.
        token_hash = hashlib.sha256(session_token.encode()).hexdigest()
        now = datetime.now(timezone.utc).isoformat()
        conn.execute("UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?", (now, token_hash))
        conn.commit()
        logger.info("Admin logout")
    response.delete_cookie("admin_session")
    return {"status": "ok"}

@router.get("/auth/me")
def check_me(admin: bool = Depends(get_admin)):
    return {"status": "ok"}


# CRUD

def log_audit(conn, action, product_id, summary=""):
    conn.execute(
        "INSERT INTO audit_log (action, product_id, timestamp, summary) VALUES (?, ?, ?, ?)",
        (action, product_id, catalogue_db._now(), summary)
    )

@router.get("/catalogue")
def get_catalogue(
    page: int = 1, limit: int = 30, q: str = None, category: str = None, in_stock: bool = None,
    sort: str = "name", deleted: bool = False, admin: bool = Depends(get_admin)
):
    if q:
        return catalogue_db.search_products(q, limit=limit, category=category, include_deleted=True)
    return catalogue_db.list_products(page=page, limit=limit, category=category, in_stock=in_stock, sort=sort, include_deleted=True)

@router.get("/catalogue/{id}")
def get_catalogue_item(id: str, admin: bool = Depends(get_admin)):
    return catalogue_db.get_product(id, include_deleted=True)

class ProductSave(BaseModel):
    name: str
    description: str = ""
    categories: list[str] = []
    topNotes: list[str] = []
    middleNotes: list[str] = []
    baseNotes: list[str] = []
    sizes: list[dict] = [] # {label, volumeMl, price, inStock}
    priceMin: int = None
    priceMax: int = None
    inStock: bool = True
    isPopular: bool = False

def sync_relations(conn, pid, data: ProductSave):
    # Categories
    conn.execute("DELETE FROM product_categories WHERE product_id = ?", (pid,))
    for c in data.categories:
        conn.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (c,))
        cid = conn.execute("SELECT id FROM categories WHERE name = ?", (c,)).fetchone()["id"]
        conn.execute("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)", (pid, cid))
    
    # Notes
    conn.execute("DELETE FROM product_notes WHERE product_id = ?", (pid,))
    layers = [('top', data.topNotes), ('heart', data.middleNotes), ('base', data.baseNotes)]
    for layer, notes in layers:
        for n in notes:
            conn.execute("INSERT OR IGNORE INTO notes (name, display) VALUES (?, ?)", (catalogue_db.slugify(n), n))
            nid = conn.execute("SELECT id FROM notes WHERE name = ?", (catalogue_db.slugify(n),)).fetchone()["id"]
            conn.execute("INSERT OR IGNORE INTO product_notes (product_id, note_id, layer) VALUES (?, ?, ?)", (pid, nid, layer))
            
    # Sizes
    conn.execute("DELETE FROM sizes WHERE product_id = ?", (pid,))
    for s in data.sizes:
        conn.execute("INSERT INTO sizes (product_id, label, volume_ml, price, in_stock) VALUES (?, ?, ?, ?, ?)",
                     (pid, s.get('label'), s.get('volumeMl'), s.get('price'), 1 if s.get('inStock') else 0))

@router.post("/catalogue")
def create_product(data: ProductSave, admin: bool = Depends(get_admin), conn: sqlite3.Connection = Depends(get_db)):
    slug = catalogue_db.slugify(data.name)
    now = catalogue_db._now()
    
    # avoid duplicates
    base = slug
    n = 2
    while conn.execute("SELECT id FROM products WHERE slug = ?", (slug,)).fetchone():
        slug = f"{base}-{n}"
        n += 1
        
    conn.execute(
        """INSERT INTO products (slug, name, description, price_min, price_max, in_stock, is_popular, origin, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?)""",
        (slug, data.name, data.description, data.priceMin, data.priceMax, 
         1 if data.inStock else 0, 1 if data.isPopular else 0, now, now)
    )
    pid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    
    sync_relations(conn, pid, data)
    log_audit(conn, "create", pid, f"Created {data.name}")
    conn.commit()
    return catalogue_db.get_product(slug, include_deleted=True)

@router.patch("/catalogue/{id}")
def update_product(id: str, data: ProductSave, admin: bool = Depends(get_admin), conn: sqlite3.Connection = Depends(get_db)):
    product = catalogue_db.get_product(id, include_deleted=True)
    if not product:
        raise HTTPException(status_code=404, detail="Not found")
    pid = conn.execute("SELECT id FROM products WHERE slug = ?", (product['slug'],)).fetchone()[0]
    
    now = catalogue_db._now()
    conn.execute(
        """UPDATE products SET name=?, description=?, price_min=?, price_max=?, 
           in_stock=?, is_popular=?, updated_at=?, admin_modified_at=? WHERE id=?""",
        (data.name, data.description, data.priceMin, data.priceMax, 
         1 if data.inStock else 0, 1 if data.isPopular else 0, now, now, pid)
    )
    
    sync_relations(conn, pid, data)
    log_audit(conn, "update", pid, f"Updated {data.name}")
    conn.commit()
    return catalogue_db.get_product(product['slug'], include_deleted=True)

@router.delete("/catalogue/{id}")
def delete_product(id: str, admin: bool = Depends(get_admin), conn: sqlite3.Connection = Depends(get_db)):
    product = catalogue_db.get_product(id, include_deleted=True)
    if not product:
        raise HTTPException(status_code=404, detail="Not found")
    pid = conn.execute("SELECT id FROM products WHERE slug = ?", (product['slug'],)).fetchone()[0]
    conn.execute("UPDATE products SET deleted_at = ?, admin_modified_at = ? WHERE id = ?", (catalogue_db._now(), catalogue_db._now(), pid))
    log_audit(conn, "delete", pid, f"Deleted {product['name']}")
    conn.commit()
    return {"status": "deleted"}

@router.post("/catalogue/{id}/restore")
def restore_product(id: str, admin: bool = Depends(get_admin), conn: sqlite3.Connection = Depends(get_db)):
    product = catalogue_db.get_product(id, include_deleted=True)
    if not product:
        raise HTTPException(status_code=404, detail="Not found")
    pid = conn.execute("SELECT id FROM products WHERE slug = ?", (product['slug'],)).fetchone()[0]
    conn.execute("UPDATE products SET deleted_at = NULL, admin_modified_at = ? WHERE id = ?", (catalogue_db._now(), pid))
    log_audit(conn, "restore", pid, f"Restored {product['name']}")
    conn.commit()
    return {"status": "restored"}

@router.post("/catalogue/{id}/images")
async def upload_image(id: str, file: UploadFile = File(...), admin: bool = Depends(get_admin), conn: sqlite3.Connection = Depends(get_db)):
    product = catalogue_db.get_product(id, include_deleted=True)
    if not product:
        raise HTTPException(status_code=404, detail="Not found")
        
    slug = product['slug']
    pid = conn.execute("SELECT id FROM products WHERE slug = ?", (slug,)).fetchone()[0]
    
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid image type")
        
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
        
    try:
        img = Image.open(io.BytesIO(content))
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGBA")
            save_kw = {"format": "WEBP", "lossless": False, "quality": 85}
        else:
            img = img.convert("RGB")
            save_kw = {"format": "WEBP", "quality": 85}
            
        assets_dir = Path(catalogue_db.DB_PATH).parent.parent.parent / "frontend" / "public" / "assets" / "products" / slug
        assets_dir.mkdir(parents=True, exist_ok=True)
        
        paths = {
            "thumb": f"/assets/products/{slug}/thumb.webp",
            "medium": f"/assets/products/{slug}/medium.webp",
            "large": f"/assets/products/{slug}/large.webp",
        }
        
        sizes = {"thumb": 240, "medium": 600, "large": 1200}
        
        # Temp save first to ensure atomic replacement
        temp_files = []
        for size_name, max_dim in sizes.items():
            resized = img.copy()
            resized.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            out_path = assets_dir / f"{size_name}_tmp.webp"
            resized.save(out_path, **save_kw)
            temp_files.append((out_path, assets_dir / f"{size_name}.webp"))
            
        for tmp, final in temp_files:
            tmp.replace(final)
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")
        
    # Update DB
    has_image = conn.execute("SELECT id FROM product_images WHERE product_id = ?", (pid,)).fetchone()
    if has_image:
        conn.execute("UPDATE product_images SET thumb_path=?, medium_path=?, large_path=? WHERE product_id=?", 
                     (paths['thumb'], paths['medium'], paths['large'], pid))
    else:
        conn.execute("INSERT INTO product_images (product_id, is_primary, sort_order, thumb_path, medium_path, large_path) VALUES (?, 1, 0, ?, ?, ?)",
                     (pid, paths['thumb'], paths['medium'], paths['large']))
                     
    log_audit(conn, "upload_image", pid)
    conn.commit()
    return catalogue_db.get_product(slug, include_deleted=True)
