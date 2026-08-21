/* Phase G/I — catalogue bridge.
    Single source of truth for the customer-facing catalogue. In Phase I it
    hydrates from the local SQLite catalogue API (real CSV data) and falls back
    to the generated dataset only when the API is unavailable. The legacy
    PERFUMES set is NOT used as a customer source — it contains fabricated notes
    and must never reach the experience. No data is invented here. */


import { apiGet } from "./apiClient";

const BOTTLE_IMG = (name) => `${process.env.PUBLIC_URL}/assets/products/${name}.jpg`;
const FALLBACK = `${process.env.PUBLIC_URL}/assets/products/frontal-bottle.jpg`;

export function bottleFor(p, size = "medium") {
  if (!p || !p.id) return FALLBACK;
  
  // Phase J: We have local product directories based on slug (p.id)
  const base = process.env.PUBLIC_URL || "";
  return `${base}/assets/products/${p.id}/${size}.webp`;
}

function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* Accepts the legacy PERFUMES shape OR the generated catalogue shape. */
export function normalizeAny(p) {
  if (!p) return null;
  const name = p.name || "";
  const categories = p.categories && p.categories.length
    ? p.categories
    : p.category
    ? [p.category]
    : [];
  const family = p.family || "";
  const notes = p.notes || {};
  const top = notes.top || p.topNotes || [];
  const heart = notes.heart || p.middleNotes || [];
  const base = notes.base || p.baseNotes || [];
  const allNotes = [
    ...top,
    ...heart,
    ...base,
    ...(p.allNotes || []),
  ];
  const status =
    p.status ||
    (p.isPopular ? "popular" : p.inStock ? "inStock" : "archived") ||
    "inStock";
  const imageUrl = p.imageUrl || FALLBACK;
  // Real price fields only — API returns priceMin/priceMax/currency (SQLite
  // catalogue). Never fabricate: absent fields stay null/undefined and
  // callers must omit price display entirely rather than show 0.
  const priceMin = p.priceMin != null ? p.priceMin : (p.price_min != null ? p.price_min : null);
  const priceMax = p.priceMax != null ? p.priceMax : (p.price_max != null ? p.price_max : null);
  const currency = p.currency || null;
  const hasPrice = priceMin != null && currency != null;
  return {
    id: p.id != null ? p.id : slug(name),
    name,
    type: p.type || "",
    category: categories[0] || "",
    categories,
    family,
    top,
    heart,
    base,
    allNotes,
    status,
    imageUrl,
    images: p.images || [],
    sizes: p.sizes || [],
    description: p.description || "",
    productUrl: p.productUrl || "",
    hasNotes: top.length + heart.length + base.length > 0,
    priceMin,
    priceMax,
    currency,
    hasPrice,
  };
}

/* Real-data-only price formatting. Returns null (never "0" or a fabricated
   value) when priceMin or currency is missing. "AED 120" for a single price,
   "AED 120–180" for a real range. */
export function formatPrice(p) {
  if (!p || p.priceMin == null || !p.currency) return null;
  if (p.priceMax != null && p.priceMax !== p.priceMin) {
    return `${p.currency} ${p.priceMin}–${p.priceMax}`;
  }
  return `${p.currency} ${p.priceMin}`;
}

let _all = null;
let _apiProducts = null;
let _apiError = null;

/* Phase I — hydrate from the local SQLite catalogue API. The customer
   experience reads from here first; it falls back to the generated dataset when
   the API is unreachable. Fabricated PERFUMES data is never used. */
export function isHydrated() {
  return _apiProducts !== null;
}

export function getHydrateError() {
  return _apiError;
}

export function setCatalogue(list) {
  if (!Array.isArray(list)) return;
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const d = normalizeAny(raw);
    const k = d.id;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(d);
  }
  _apiProducts = out;
}

export async function hydrateCatalogue({ signal } = {}) {
  try {
    const first = await apiGet("/api/catalogue?limit=100&page=1", { signal });
    const items = [...(first.items || [])];
    let page = 2;
    while (first.hasMore && items.length < (first.total || 0)) {
      const r = await apiGet(`/api/catalogue?limit=100&page=${page}`, { signal });
      items.push(...(r.items || []));
      if (!r.hasMore) break;
      page += 1;
    }
    setCatalogue(items);
    _apiError = null;
    return { ok: true, count: items.length };
  } catch (e) {
    _apiError = e && e.message ? e.message : String(e);
    return { ok: false, error: _apiError };
  }
}

export function getAllProducts() {
  if (_apiProducts) return _apiProducts;
  if (_all) return _all;
  return [];
}

/* Real category names as they exist in the SQLite catalogue (GET
   /api/categories) — never a curated/invented subset. The Collection filter
   bar reads from here so tapping a pill filters against the real
   product_categories join, not a guessed label. */
let _categories = null;
let _categoriesError = null;

export function getCategories() {
  return _categories || [];
}

export function categoriesHydrated() {
  return _categories !== null;
}

export async function hydrateCategories({ signal } = {}) {
  try {
    const r = await apiGet("/api/categories", { signal });
    const items = (r.items || [])
      .map((c) => (typeof c === "string" ? c : c.name))
      .filter(Boolean);
    _categories = items;
    _categoriesError = null;
    return { ok: true, count: items.length };
  } catch (e) {
    _categoriesError = e && e.message ? e.message : String(e);
    return { ok: false, error: _categoriesError };
  }
}

export function getCategoriesError() {
  return _categoriesError;
}

/* Defensible similarity: shared family + category + overlapping notes.
   No fabricated "92% match" score — just an ordered, honest shortlist. */
export function getRelated(current, limit = 6) {
  const all = getAllProducts();
  const cur = normalizeAny(current);
  if (!cur) return [];
  const curNotes = new Set(cur.allNotes.map((n) => n.toLowerCase()));
  const scored = all
    .filter((p) => p.id !== cur.id && p.name.toLowerCase() !== cur.name.toLowerCase())
    .map((p) => {
      let score = 0;
      if (p.family && p.family === cur.family) score += 3;
      if (p.category && p.category === cur.category) score += 2;
      const overlap = p.allNotes.filter((n) => curNotes.has(n.toLowerCase())).length;
      score += overlap;
      if (p.status === "inStock") score += 0.5;
      return { p, score, overlap };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.overlap - a.overlap)
    .slice(0, limit)
    .map((x) => x.p);
  return scored;
}
