/* Phase F — catalogue repository.
   In-memory, memoised index over the generated dataset.
   The UI never touches the raw array or CSV; it asks the repo.
   Swapping to /api/search later means re-implementing only this file. */

import { getAllProducts } from "../utils/catalogueBridge";

function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildProductIndex(p) {
  const nameN = norm(p.name);
  const catN = p.categories.map(norm).join(" ");
  const notesN = p.allNotes.map(norm).join(" ");
  const familyN = norm(p.family);
  const descN = norm(p.description);
  const searchBlob = [nameN, catN, notesN, familyN, descN].filter(Boolean).join(" ");
  return {
    raw: p,
    nameN,
    catN,
    notesN,
    familyN,
    searchBlob,
    words: nameN.split(" ").filter(Boolean),
  };
}

let _cache = null;
let _cacheSrc = null;

function getCache() {
  const products = getAllProducts();
  if (_cache && _cacheSrc === products) return _cache;
  _cacheSrc = products;
  const items = products.map(buildProductIndex);
  const notes = new Map();
  const categories = new Map();
  products.forEach((p) => {
    (p.allNotes || []).forEach((n) => {
      const k = norm(n);
      if (k && !notes.has(k)) notes.set(k, n);
    });
    (p.categories || []).forEach((c) => {
      const k = norm(c);
      if (k && !categories.has(k)) categories.set(k, c);
    });
  });
  const meta = {
    total: products.length,
    count: products.length,
    hasNotes: products.some(
      (p) =>
        (p.allNotes && p.allNotes.length) ||
        p.hasNotes ||
        (p.topNotes && p.topNotes.length)
    ),
    hasImages: products.some((p) => p.imageUrl),
    source: "catalogue",
  };
  _cache = {
    items,
    noteKeys: [...notes.keys()],
    noteLabels: notes,
    categoryKeys: [...categories.keys()],
    categoryLabels: categories,
    total: products.length,
    meta,
  };
  return _cache;
}

export const catalogueRepository = {
  total: () => getCache().total,
  meta: () => getCache().meta,
  all: () => getAllProducts(),
  get: (id) => getAllProducts().find((p) => p.id === id) || null,

  // Distinct facet values for filters (only what the data supports).
  facets: () => {
    const c = getCache();
    const families = new Set();
    const availability = new Set();
    getAllProducts().forEach((p) => {
      if (p.family) families.add(p.family);
      availability.add(p.inStock ? "inStock" : "archived");
    });
    return {
      categories: c.categoryLabels,
      notes: c.noteLabels,
      families: [...families],
      availability: [...availability],
      hasNotes: c.meta.hasNotes,
      hasImages: c.meta.hasImages,
    };
  },

  noteSuggestions: (limit = 8) => {
    const c = getCache();
    return [...c.noteLabels.values()].slice(0, limit);
  },

  categorySuggestions: (limit = 6) => {
    const c = getCache();
    return [...c.categoryLabels.values()].slice(0, limit);
  },
};

export { norm };
