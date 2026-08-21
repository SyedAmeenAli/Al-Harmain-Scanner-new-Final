"""Al Haramain — read-only catalogue REST API (Phase I).

Mounted under /api on the existing FastAPI backend. Reads exclusively from
the local SQLite catalogue store. No write endpoints are exposed here;
admin CRUD arrives in a later phase. Parameterized queries only.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

import catalogue_db as db

catalogue_router = APIRouter(prefix="/api")


@catalogue_router.get("/catalogue")
def get_catalogue(
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    category: Optional[str] = None,
    type: Optional[str] = None,
    note: Optional[str] = None,
    inStock: Optional[bool] = None,
    sort: str = Query("name", pattern="^(name|popular|price_asc|price_desc)$"),
):
    """Paginated catalogue with optional filters.

    Returns items / total / page / limit / hasMore.
    """
    return db.list_products(
        page=page,
        limit=limit,
        category=category,
        type_=type,
        note=note,
        in_stock=inStock,
        sort=sort,
    )


@catalogue_router.get("/catalogue/{identifier}")
def get_catalogue_item(identifier: str):
    """Full product detail by slug or numeric id."""
    product = db.get_product(identifier)
    if not product:
        raise HTTPException(status_code=404, detail="Catalogue item not found")
    related = db.related_products(identifier, limit=6)
    return {"product": product, "related": related}


@catalogue_router.get("/catalogue/{identifier}/related")
def get_related(identifier: str):
    product = db.get_product(identifier)
    if not product:
        raise HTTPException(status_code=404, detail="Catalogue item not found")
    return {"items": db.related_products(identifier, limit=8)}


@catalogue_router.get("/search")
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(30, ge=1, le=100),
    category: Optional[str] = None,
):
    """Catalogue search preserving Phase F ranking tiers."""
    items = db.search_products(q, limit=limit, category=category)
    return {"query": q, "total": len(items), "items": items}


@catalogue_router.get("/categories")
def categories():
    return {"items": db.list_categories()}


@catalogue_router.get("/notes")
def notes():
    return {"items": db.list_notes()}
