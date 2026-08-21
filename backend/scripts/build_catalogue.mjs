/* =========================================================
   build_catalogue.mjs
   ---------------------------------------------------------
   Normalizes the Al Haramain catalogue export into a
   frontend-friendly generated dataset.

   Source (in priority order):
     1. backend/seed_data/al_haramain_catalogue_full.csv
        (the richer export: product_name, category, notes,
         description, sizes, mrp, sale_price, currency,
         in_stock, product_url, product_image, is_variable)
     2. backend/seed_data/products.csv  (204 simplified rows)
        If (1) is missing, we MATERIALISE it from (2) as a
        documented working seed so the app always builds.
        Replace (1) with the real export to upgrade notes +
        real bottle imagery — no code changes required.

   Output:
     frontend/src/experience/data/catalogue.generated.js

   The generated dataset is the single source the Phase F
   search service consumes. Swapping the CSV later needs no
   change to the React code.
   ========================================================= */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SEED_FULL = resolve(ROOT, "backend", "seed_data", "al_haramain_catalogue_full.csv");
const SEED_SIMPLE = resolve(ROOT, "backend", "seed_data", "products.csv");
const OUT = resolve(ROOT, "frontend", "src", "experience", "data", "catalogue.generated.js");

/* ---------- tiny RFC4180-ish CSV parser ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function pick(headers, row, ...candidates) {
  for (const cand of candidates) {
    const idx = headers.indexOf(cand);
    if (idx >= 0 && row[idx] != null) return row[idx].trim();
  }
  return "";
}

function splitList(v) {
  if (!v) return [];
  return v
    .split(/[;|,]|\n|•|·/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumber(v) {
  if (v == null) return null;
  const m = String(v).match(/[\d,]+\.?\d*/g);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/* Parse notes text into top/middle/base when structured. */
function parseNotes(raw) {
  const text = (raw || "").trim();
  if (!text) return { top: [], middle: [], base: [], all: [] };
  const block = (label) => {
    const re = new RegExp(`${label}\\s*[:\\-]\\s*([\\s\\S]*?)(?=\\n\\s*(Top|Middle|Base|Heart)\\s*[:\\-]|$)`, "i");
    const m = text.match(re);
    return m ? splitList(m[1]) : [];
  };
  const hasStructure = /\b(Top|Middle|Base|Heart)\s*[:\-]/i.test(text);
  if (hasStructure) {
    const top = block("Top");
    const middle = block("Middle") || block("Heart");
    const base = block("Base");
    const all = [...top, ...middle, ...base];
    return { top, middle, base, all };
  }
  const all = splitList(text);
  return { top: all, middle: [], base: [], all };
}

function parsePriceRange(raw) {
  const nums = String(raw || "").match(/[\d,]+\.?\d*/g);
  if (!nums || !nums.length) return [null, null];
  const cleaned = nums.map((n) => parseFloat(n.replace(/,/g, "")));
  const min = cleaned[0];
  const max = cleaned.length > 1 ? cleaned[cleaned.length - 1] : cleaned[0];
  return [min, max];
}

/* ---------- materialise the full seed if absent ---------- */
function ensureFullCsv() {
  if (existsSync(SEED_FULL)) return { path: SEED_FULL, source: "full" };
  if (!existsSync(SEED_SIMPLE)) {
    throw new Error("No catalogue CSV found (expected al_haramain_catalogue_full.csv or products.csv).");
  }
  const simple = readFileSync(SEED_SIMPLE, "utf8");
  const rows = parseCSV(simple);
  const headers = rows[0];
  const out = [["product_name", "category", "notes", "description", "sizes", "mrp", "sale_price", "currency", "in_stock", "product_url", "product_image", "is_variable"]];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = pick(headers, r, "Product Name");
    const category = pick(headers, r, "Category");
    const family = pick(headers, r, "Scent Family");
    const status = pick(headers, r, "Status");
    const [min, max] = parsePriceRange(pick(headers, r, "Price Range (₹)"));
    out.push([
      name,
      category,
      "", // notes absent in simplified source — filled by real export
      "",
      "",
      max != null ? String(max) : "",
      min != null ? String(min) : "",
      "INR",
      /in stock/i.test(status) ? "true" : "false",
      "",
      "",
      "",
    ]);
  }
  const csv = out.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
  writeFileSync(SEED_FULL, csv + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.warn("[build_catalogue] Materialised working seed from products.csv ->", SEED_FULL);
  return { path: SEED_FULL, source: "products-seed" };
}

/* ---------- normalise ---------- */
function normalise(rows) {
  const headers = rows[0];
  const products = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = pick(headers, r, "product_name", "Product Name");
    if (!name) continue;
    const categoryRaw = pick(headers, r, "category", "Category");
    const categories = splitList(categoryRaw).length ? splitList(categoryRaw) : categoryRaw ? [categoryRaw] : [];
    const notesRaw = pick(headers, r, "notes") || pick(headers, r, "Scent Family");
    const parsed = parseNotes(notesRaw);
    const mrp = toNumber(pick(headers, r, "mrp"));
    const sale = toNumber(pick(headers, r, "sale_price"));
    let priceMin = null;
    let priceMax = null;
    if (mrp != null || sale != null) {
      priceMin = Math.min(mrp ?? sale, sale ?? mrp);
      priceMax = Math.max(mrp ?? sale, sale ?? mrp);
    } else {
      const fam = pick(headers, r, "Product Name"); // not used
      const [mn, mx] = parsePriceRange(pick(headers, r, "Price Range (₹)"));
      priceMin = mn;
      priceMax = mx;
    }
    const inStockRaw = pick(headers, r, "in_stock", "Status");
    const inStock = /^(true|in stock|yes|1)$/i.test(inStockRaw);
    const imageUrl = pick(headers, r, "product_image", "product_image_url") || null;
    const slug = slugify(name) || `item-${i}`;
    const family = (categories[0] || "").split(/\s+/)[0] || "";
    products.push({
      id: `ah-${i}`,
      slug: `${slug}-${i}`,
      name,
      categories,
      family,
      description: pick(headers, r, "description"),
      topNotes: parsed.top,
      middleNotes: parsed.middle,
      baseNotes: parsed.base,
      allNotes: parsed.all,
      sizes: splitList(pick(headers, r, "sizes")),
      priceMin,
      priceMax,
      currency: pick(headers, r, "currency") || "INR",
      inStock,
      productUrl: pick(headers, r, "product_url") || "",
      imageUrl,
      isPopular: false, // no popularity flag present in source data
      bottle: slug,
      notes: { top: parsed.top, heart: parsed.middle, base: parsed.base },
      status: inStock ? "inStock" : "archived",
    });
  }
  return products;
}

/* ---------- run ---------- */
const { path, source } = ensureFullCsv();
const text = readFileSync(path, "utf8");
const rows = parseCSV(text);
const products = normalise(rows);

const hasNotes = products.some((p) => p.allNotes.length > 0);
const hasImages = products.some((p) => p.imageUrl);

const banner = `/* AUTO-GENERATED by backend/scripts/build_catalogue.mjs.
   Source: ${source === "full" ? "al_haramain_catalogue_full.csv" : "products.csv (working seed)"}
   Do NOT edit by hand. Edit the CSV + rerun the script.
   hasNotes: ${hasNotes}  hasImages: ${hasImages} */
`;

const body = `${banner}
export const CATALOGUE = ${JSON.stringify(products, null, 0)};

export const CATALOGUE_META = {
  source: ${JSON.stringify(source)},
  count: ${products.length},
  hasNotes: ${hasNotes},
  hasImages: ${hasImages},
  generatedAt: ${JSON.stringify(new Date().toISOString())},
};
`;

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, body, "utf8");
// eslint-disable-next-line no-console
console.log(`[build_catalogue] Wrote ${products.length} products -> ${OUT}`);
