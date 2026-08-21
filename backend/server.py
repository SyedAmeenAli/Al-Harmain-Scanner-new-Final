"""Al Haramain — Museum of Scent backend.

FastAPI service that powers the SQLite-backed catalogue (Book of Fragrances)
and the PIN-based admin panel.
"""
from __future__ import annotations

import logging
import logging.handlers
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

# Phase I — local SQLite catalogue API (reuses the existing FastAPI app).
import catalogue_db
import admin_routes
from catalogue_routes import catalogue_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

APP_ENV = os.environ.get("APP_ENV", "development")
APP_VERSION = "phase-k-1.0.0"
FRONTEND_BUILD_DIR = (ROOT_DIR.parent / "frontend" / "build").resolve()

_LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
_log_handlers: list[logging.Handler] = [logging.StreamHandler()]

# Optional rotating file log — enabled by setting LOG_FILE (e.g.
# deployment/windows/logs/backend.log). Never logs PINs, PIN hashes, raw
# session tokens, cookies, or uploaded-file bytes — only outcomes/errors.
_log_file = os.environ.get("LOG_FILE")
if _log_file:
    log_path = Path(_log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    _log_handlers.append(
        logging.handlers.RotatingFileHandler(
            log_path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
        )
    )

logging.basicConfig(level=_LOG_LEVEL, format=_LOG_FORMAT, handlers=_log_handlers)
logger = logging.getLogger("alharamain")


# --------------------------------------------------------------------------- #
# FastAPI app
# --------------------------------------------------------------------------- #
app = FastAPI(title="Al Haramain — Museum of Scent API", debug=False)


@app.exception_handler(Exception)
async def _unexpected_error_handler(request: Request, exc: Exception):
    # Logged server-side with a stack trace for operators; the client only
    # ever sees a generic message — no traceback, no internals leak.
    logger.error("Unexpected error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("Starting Al Haramain backend (APP_ENV=%s, version=%s)", APP_ENV, APP_VERSION)

    # Phase I — ensure the local SQLite catalogue schema exists. This is the
    # primary (and only) customer-facing catalogue store.
    try:
        catalogue_db.init_catalogue_db()
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("SQLite catalogue init skipped: %s", exc)

    # Phase K — startup validation. Non-fatal issues (admin not configured,
    # zero products, missing build dir) are logged as warnings; the process
    # only exits on a truly unreadable/corrupt DB.
    try:
        info = catalogue_db.get_health_info()
        if info["products"] == 0:
            logger.warning(
                "Catalogue has 0 products — check DB path / import. DB=%s",
                catalogue_db.DB_PATH,
            )
        else:
            logger.info("Catalogue OK: %s products", info["products"])
        if not info["admin_configured"]:
            logger.warning(
                "Admin PIN not configured — admin login will return 503 "
                "admin_not_configured until an operator runs set_admin_pin.py"
            )
        removed = catalogue_db.cleanup_expired_sessions()
        if removed:
            logger.info("Cleaned up %s expired/revoked admin session(s)", removed)
    except Exception as exc:
        logger.error("FATAL: SQLite catalogue database is unreadable: %s", exc)
        raise SystemExit(1)

    if FRONTEND_BUILD_DIR.exists():
        if (FRONTEND_BUILD_DIR / "index.html").exists():
            logger.info("Production frontend build found at %s", FRONTEND_BUILD_DIR)
        else:
            logger.warning(
                "frontend/build exists but has no index.html — run `npm run build`."
            )
    else:
        logger.warning(
            "frontend/build not found — backend will serve API only. "
            "Run `npm run build` in frontend/ for same-origin production serving."
        )


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("Shutting down Al Haramain backend")


# --------------------------------------------------------------------------- #
# Public routes
# --------------------------------------------------------------------------- #
core_router = APIRouter(prefix="/api")


@core_router.get("/")
async def root():
    return {"service": "Al Haramain — Museum of Scent", "status": "luminous"}


@core_router.get("/health")
async def health():
    """Public, secret-free health check for check_store_health.py and
    manual operator verification. No filesystem paths, no tracebacks."""
    try:
        info = catalogue_db.get_health_info()
        db_ok = True
    except Exception:
        info = {"products": 0, "admin_configured": False}
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "catalogue": db_ok and info["products"] > 0,
        "database": db_ok,
        "products": info["products"],
        "admin_configured": info["admin_configured"],
        "version": APP_VERSION,
    }


# --------------------------------------------------------------------------- #
# Mount
# --------------------------------------------------------------------------- #
app.include_router(core_router)  # /, /health — always on
app.include_router(catalogue_router)  # customer catalogue — always on
app.include_router(admin_routes.router)  # Phase J SQLite admin — always on

# Serve fast-start re-muxed media (branded hero video etc.) so the browser
# can progressively stream it. We mount under /api/media to traverse the
# Kubernetes ingress rule that proxies /api/* to the backend.
STATIC_DIR = ROOT_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)
(STATIC_DIR / "media").mkdir(exist_ok=True)
app.mount("/api/media", StaticFiles(directory=STATIC_DIR / "media"), name="media")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Phase K — same-origin production serving of the React build.
#
# Only wired when frontend/build actually exists, so a backend-only dev
# checkout (`uvicorn server:app --reload` against a fresh clone with no build
# yet) keeps working — it just serves the API and logs a warning (see
# on_startup above) instead of crashing on a missing directory.
# --------------------------------------------------------------------------- #
if FRONTEND_BUILD_DIR.exists() and (FRONTEND_BUILD_DIR / "index.html").exists():
    STATIC_ASSETS_DIR = FRONTEND_BUILD_DIR / "static"
    INDEX_HTML = FRONTEND_BUILD_DIR / "index.html"

    # CRA content-hashes everything under build/static/** (e.g.
    # main.<hash>.js) — safe to cache for a year, immutable.
    if STATIC_ASSETS_DIR.exists():
        app.mount("/static", StaticFiles(directory=STATIC_ASSETS_DIR), name="cra-static")

    # `npm run build` copies frontend/public/** into frontend/build/**, so
    # this single mount also covers /assets/products/<slug>/*.webp,
    # /assets/ingredients/*.png, /assets/video/hero-*.mp4, fonts.css, the
    # logo, etc. — the same tree CRA dev-serves from `public/`, not a
    # duplicate copy. Product image filenames are NOT content-hashed, so we
    # rely on Starlette's default Last-Modified/ETag (sent automatically by
    # StaticFiles) for conditional revalidation rather than long max-age.
    if (FRONTEND_BUILD_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_BUILD_DIR / "assets"), name="cra-assets")

    @app.middleware("http")
    async def _cache_control_headers(request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith("/static/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path == "/" or path.endswith("/index.html"):
            response.headers["Cache-Control"] = "no-cache"
        return response

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        """SPA app-shell fallback for client-side routes (/experience,
        /admin/catalogue, etc.). Must NEVER catch /api/* — those either
        matched a real route above already, or are a genuine 404 and must
        stay JSON, not silently become index.html."""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")

        candidate = (FRONTEND_BUILD_DIR / full_path).resolve()
        try:
            candidate.relative_to(FRONTEND_BUILD_DIR)
        except ValueError:
            raise HTTPException(status_code=404, detail="Not Found")

        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(INDEX_HTML, headers={"Cache-Control": "no-cache"})
else:
    logger.warning(
        "frontend/build missing or incomplete — SPA/static serving not mounted. "
        "API-only mode."
    )
