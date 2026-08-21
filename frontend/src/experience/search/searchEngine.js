/* Phase F — search engine.
   Pure ranking logic. No React. Operates on the repository index. */

import { norm } from "./catalogueRepository";
import { getAllProducts } from "../utils/catalogueBridge";

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function isSubsequence(needle, hay) {
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) {
    if (needle[i] === hay[j]) i++;
  }
  return i === needle.length;
}

/* Ranking tiers (lower number = stronger):
   1 exact name   2 name-prefix   3 strong fuzzy name
   4 partial name 5 exact note/type/category   6 weak metadata */
function rankName(nameN, q) {
  if (!nameN) return null;
  if (nameN === q) return { tier: 1, score: 1000 };
  if (nameN.startsWith(q)) return { tier: 2, score: 820 - (nameN.length - q.length) };
  const d = levenshtein(nameN, q);
  const maxLen = Math.max(nameN.length, q.length);
  const tol = Math.max(1, Math.round(maxLen * 0.25));
  if (d <= tol) return { tier: 3, score: 620 - d * 18 };
  if (nameN.includes(q)) return { tier: 4, score: 430 };
  if (isSubsequence(q, nameN)) return { tier: 4, score: 360 };
  return null;
}

function matchFragrances(q, cache) {
  const fragrances = [];
  for (const it of cache.items) {
    const nr = rankName(it.nameN, q);
    if (nr) {
      fragrances.push({
        product: it.raw,
        tier: nr.tier,
        score: nr.score + (it.raw.inStock ? 4 : 0),
      });
      continue;
    }
    // metadata: note / type / category
    if (cache.noteKeys.includes(q) || it.notesN.split(" ").includes(q)) {
      fragrances.push({ product: it.raw, tier: 5, score: 210 });
      continue;
    }
    if (cache.categoryKeys.includes(q) || it.catN.split(" ").includes(q) || it.familyN === q) {
      fragrances.push({ product: it.raw, tier: 5, score: 190 });
      continue;
    }
    if (it.notesN.includes(q) || it.catN.includes(q) || it.descN?.includes(q)) {
      fragrances.push({ product: it.raw, tier: 6, score: 120 });
    }
  }
  fragrances.sort((a, b) => a.tier - b.tier || b.score - a.score);
  return fragrances;
}

function matchNotes(q, cache) {
  const out = [];
  for (const [key, label] of cache.noteLabels) {
    if (key === q || key.startsWith(q) || key.includes(q)) {
      out.push({ key, label });
    }
  }
  return out.slice(0, 6);
}

function matchCategories(q, cache) {
  const out = [];
  for (const [key, label] of cache.categoryLabels) {
    if (key === q || key.startsWith(q) || key.includes(q)) {
      out.push({ key, label });
    }
  }
  return out.slice(0, 6);
}

/**
 * Search the catalogue.
 * @param {string} query
 * @param {{quick?: boolean}} opts quick -> cap fragrances to 8
 * @returns {{fragrances:object[],notes:object[],categories:object[],total:number,hasDirectNameMatch:boolean}}
 */
export function search(query, opts = {}) {
  const q = norm(query);
  const cache = getCache();
  if (!q) {
    return { fragrances: [], notes: [], categories: [], total: 0, hasDirectNameMatch: false };
  }
  const fragrances = matchFragrances(q, cache);
  const notes = matchNotes(q, cache);
  const categories = matchCategories(q, cache);
  const quick = opts.quick !== false;
  const shown = quick ? fragrances.slice(0, 8) : fragrances;
  const hasDirectNameMatch = fragrances.some((f) => f.tier <= 4);
  return {
    fragrances: shown,
    notes,
    categories,
    total: fragrances.length,
    hasDirectNameMatch,
  };
}

/* Descriptive fallback: a query with multiple descriptive words and
   no direct product-name hit suggests routing to Scent Concierge. */
export function isDescriptive(query, hasDirectNameMatch) {
  const q = norm(query);
  if (!q || hasDirectNameMatch) return false;
  const words = q.split(" ").filter((w) => w.length > 2);
  return words.length >= 2;
}

function getCache() {
  const products = getAllProducts();
  if (_lightCache && _lightSrc === products) return _lightCache;
  _lightSrc = products;
  _lightCache = buildLightCache(products);
  return _lightCache;
}

/* Build a light cache view for the engine (kept in sync with the live
   catalogue — the API when hydrated, otherwise the generated dataset). */
function buildLightCache(CATALOGUE) {
  const items = CATALOGUE.map((p) => ({
    raw: p,
    nameN: norm(p.name),
    notesN: (p.allNotes || []).map(norm).join(" "),
    catN: (p.categories || []).map(norm).join(" "),
    familyN: norm(p.family),
    descN: norm(p.description),
  }));
  const noteLabels = new Map();
  const categoryLabels = new Map();
  CATALOGUE.forEach((p) => {
    (p.allNotes || []).forEach((n) => {
      const k = norm(n);
      if (k && !noteLabels.has(k)) noteLabels.set(k, n);
    });
    (p.categories || []).forEach((c) => {
      const k = norm(c);
      if (k && !categoryLabels.has(k)) categoryLabels.set(k, c);
    });
  });
  return {
    items,
    noteKeys: [...noteLabels.keys()],
    noteLabels,
    categoryKeys: [...categoryLabels.keys()],
    categoryLabels,
  };
}

let _lightCache = null;
let _lightSrc = null;
