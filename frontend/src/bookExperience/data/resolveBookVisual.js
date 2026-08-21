/* resolveBookVisual — single source of truth for which image represents a
   given real catalogue product in the Book Experience.

   Priority order (per brief):
   1. Exact named/special product mapping (verified against real
      `SELECT name FROM products WHERE deleted_at IS NULL` rows — see the
      commented evidence below each entry).
   2. Product-name keyword mapping (bakhoor vs holder, freshener scent,
      gift set).
   3. product.type mapping — reuses the exact ATTAR/PERFUME allowlists
      already established+audited in InfiniteShelf.jsx (not rederived).
   4. product.categories mapping — same allowlists, category side.
   5. Stable fallback family (general perfume pool).

   The general perfume/attar pools are chosen via a stable hash of
   product.id (or slug) modulo pool length, so the same product always
   renders the same bottle across reloads — never Math.random(). */

import {
  PERFUME_POOL,
  ATTAR_POOL,
  BAKHOOR_POOL,
  HOLDERS,
  FRESHENER,
  GIFTS,
  SPECIAL,
  TRANSPARENT_POOL,
  FLOATING_SPECIAL,
} from "./bookAssetManifest.js";
import { getCatalogueImage } from "./catalogueImageMap.js";

/* Reused verbatim from InfiniteShelf.jsx (Phase L.2B Part 1, read-only
   SQLite audit, deleted_at IS NULL). Do not rederive. */
const ATTAR_TYPE_VALUES = ["Clone Attar", "Arabic Attar", "Arabic Attars"];
const ATTAR_CATEGORY_VALUES = [
  "Clone Attar",
  "Arabic Attar",
  "Arabic Attars",
  "French Attar",
  "French Attars",
  "Attar Bottles",
  "Premium Attars",
  "Indian Attar",
];
const PERFUME_TYPE_VALUES = ["Clone Perfumes", "Arabic Perfumes", "French Perfumes"];
const PERFUME_CATEGORY_VALUES = [
  "Clone Perfumes",
  "Arabic Perfumes",
  "French Perfumes",
  "Premium Perfumes",
  "Perfume Bottles",
];

/* Task 7 fix: a small number of real rows carry NEITHER a `type` NOR any
   `categories` (both null/empty — confirmed via read-only SQLite audit,
   e.g. product id 2957 "Blue oud IAQ super (Attar)"). When there is no
   taxonomy data at all to disagree with, the literal "(Attar)"/"(Perfume)"
   name suffix is the only real signal available and is used ONLY as a
   last-resort fallback here — it never overrides a genuine type/categories
   match (checked first, below), so it can't corrupt any row that already
   has real taxonomy data. */
function hasNoTaxonomy(p) {
  return !p.type && !(p.categories || []).length;
}
function nameHasSuffix(p, word) {
  return new RegExp(`\\(\\s*${word}\\s*\\)\\s*$`, "i").test(String(p?.name || ""));
}

export function isAttarProduct(p) {
  if (
    ATTAR_TYPE_VALUES.includes(p.type) ||
    (p.categories || []).some((c) => ATTAR_CATEGORY_VALUES.includes(c))
  ) {
    return true;
  }
  return hasNoTaxonomy(p) && nameHasSuffix(p, "Attar");
}
export function isPerfumeProduct(p) {
  if (
    PERFUME_TYPE_VALUES.includes(p.type) ||
    (p.categories || []).some((c) => PERFUME_CATEGORY_VALUES.includes(c))
  ) {
    return true;
  }
  return hasNoTaxonomy(p) && nameHasSuffix(p, "Perfume");
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasToken(norm, token) {
  // whole-token containment with word boundaries, not raw substring, so
  // e.g. "oud" (too generic, deliberately excluded below) never
  // false-matches inside "loud"/"cloudy" etc.
  const re = new RegExp(`(^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
  return re.test(norm);
}

/* Named/special product mapping. Each entry's `tokens` were verified
   against real product names in the live catalogue (read-only SELECT,
   deleted_at IS NULL) — evidence noted inline. Deliberately conservative:
   generic single words that appear in hundreds of unrelated names (e.g.
   bare "oud", "moon" is borderline but distinctive enough combined with
   its low collision rate) are excluded or required as multi-word phrases. */
const SPECIAL_RULES = [
  // "Hudson valley 50ml pack" (3137), "Hudson valley gissah" (3659/3660)
  { tokens: ["hudson valley"], image: SPECIAL.hudsonValley, family: "special", variant: "hudson-valley" },
  // "Night oud perfume pack" (3101), "Night Oud Super" (4021/4023),
  // "Night oud by Al Haramain" (4264/4265)
  { tokens: ["night oud"], image: SPECIAL.nightOud, family: "special", variant: "night-oud" },
  // "Tygar luxury Perfume Pack" (3109), "Bvl Tygar" (3121/4026)
  { tokens: ["tygar"], image: SPECIAL.tygar, family: "special", variant: "tygar" },
  // "100ml ultra blue skull pack" (3140)
  { tokens: ["skull"], image: SPECIAL.skullOnMarble, family: "special", variant: "skull" },
  // "Cowboy theme bottle 100 ml" (3041), "Cowboy leather" (3042/3043)
  { tokens: ["cowboy"], image: SPECIAL.cowboy, family: "special", variant: "cowboy" },
  // "Dylan turquoise" (3562/3563)
  { tokens: ["turquoise"], image: SPECIAL.turquoise, family: "special", variant: "turquoise" },
  // "More than words super Charminar pack" (3423), "Charminar theme 100 ml" (3426)
  { tokens: ["charminar"], image: SPECIAL.charminar, family: "special", variant: "charminar" },
  // "Bleu De Channel L exclusif ..." (2969/2970/3060/3061/3699), "Bleu 100 ML Pack" (3223)
  { tokens: ["bleu"], image: SPECIAL.bleu, family: "special", variant: "bleu" },
  // "The moon luxury Perfume pack" (3118), "Blue moon ginger" (3633/3634/3724/3725)
  { tokens: ["moon"], image: SPECIAL.moon, family: "special", variant: "moon" },
  // "Ice 100 ML Pack EDP" (3222), "Hawas ice" (3711/3712)
  { tokens: ["ice"], image: SPECIAL.ice, family: "special", variant: "ice" },
];

/* Bakhoor vs holder/burner disambiguation — real type values confirmed
   (deleted_at IS NULL): products.type "Bakhoor & Oud" (actual bakhoor,
   e.g. "Marwah Scented Bakhoor Sticks", "Oud Arabi bakhoor") vs
   "Oud burner" (holders, e.g. "Pink comb incense burner",
   "USB charging incense burner"). Name-token fallback covers rows without
   a clean type value. */
const HOLDER_TOKENS = ["holder", "burner", "mabkhara", "stand"];
const BAKHOOR_TOKENS = ["bakhoor", "bukhoor", "oud stick", "incense stick"];

/* Real rows confirmed to collide on name alone (read-only SELECT, deleted_at
   IS NULL): "Bakhoor by Al Haramain (Attar)" (4289, type "Arabic Attar")
   and "Bakhoor by Al Haramain (Perfume)" (4290, type "Arabic Perfumes") are
   genuine Attar/Perfume products whose NAME contains "bakhoor" as a scent
   descriptor, not an actual Bakhoor product. Name-token bakhoor/holder
   detection is therefore only a FALLBACK for rows whose type doesn't
   already resolve to a known real family — when `type` cleanly says
   Attar/Perfume/Air Freshener/Gift Sets, that always wins over a
   name-token guess. */
const KNOWN_OTHER_TYPES = new Set([
  ...ATTAR_TYPE_VALUES,
  ...PERFUME_TYPE_VALUES,
  "Air Freshener",
  "Gift Sets",
]);

function isHolderProduct(p, norm) {
  if (p.type === "Oud burner") return true;
  if (KNOWN_OTHER_TYPES.has(p.type)) return false;
  return HOLDER_TOKENS.some((t) => hasToken(norm, t));
}
function isBakhoorProduct(p, norm) {
  if (p.type === "Bakhoor & Oud") return true;
  if (KNOWN_OTHER_TYPES.has(p.type)) return false;
  return BAKHOOR_TOKENS.some((t) => hasToken(norm, t));
}

/* Bookmark-filter helpers (BookBookmarks/FragranceBook): bakhoor bookmark
   includes both actual bakhoor AND holders (both are "the bakhoor chapter"
   from a browsing standpoint), freshener bookmark is type-based. Exported
   so filtering logic lives in one place, not re-derived per component. */
export function isBakhoorOrHolderProduct(p) {
  const norm = normalize(p.name);
  return isBakhoorProduct(p, norm) || isHolderProduct(p, norm);
}
export function isFreshenerProduct(p) {
  const norm = normalize(p.name);
  return p.type === "Air Freshener" || norm.includes("air freshener") || norm.includes("airfreshner");
}

function isGiftProduct(p, norm) {
  if (p.type === "Gift Sets") return true;
  if ((p.categories || []).includes("Gift Sets")) return true;
  return ["gift set", "gift box", "giftbox", "gift pack"].some((t) => norm.includes(t));
}

/* Stable string hash (djb2-like) — deterministic, no Math.random. */
function stableHash(str) {
  let h = 5381;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h >>> 0);
}

function pickFromPool(pool, seed) {
  if (!pool.length) return null;
  const idx = stableHash(seed) % pool.length;
  return pool[idx];
}

/* Single shared classification pipeline — the exact precedence order from
   the brief, run once and reused by every context (editorial/thumb/
   floating) so they can never disagree about what family a product
   belongs to:
     1. exact special-name match
     2. isBakhoorHolder
     3. isBakhoor
     4. isFreshener
     5. isGiftSet
     6. isAttar
     7. isPerfume
     8. fallback (generic perfume) */
function classifyProduct(p, name) {
  for (const rule of SPECIAL_RULES) {
    if (rule.tokens.some((t) => hasToken(name, t))) {
      return { kind: "special", rule };
    }
  }
  if (isHolderProduct(p, name)) return { kind: "holder" };
  if (isBakhoorProduct(p, name)) return { kind: "bakhoor" };
  if (p.type === "Air Freshener" || name.includes("air freshener") || name.includes("airfreshner")) {
    const isCitrusLemon = /\blemon\b/.test(name);
    const isOrange = /\borange\b/.test(name);
    const image = isCitrusLemon ? FRESHENER.lemon : isOrange ? FRESHENER.orange : null;
    return {
      kind: "freshener",
      variant: isCitrusLemon ? "lemon" : isOrange ? "orange" : "alternating",
      image,
    };
  }
  if (isGiftProduct(p, name)) return { kind: "gift" };
  if (isAttarProduct(p)) return { kind: "attar" };
  if (isPerfumeProduct(p)) return { kind: "perfume" };
  return { kind: "fallback" };
}

/* Public classification helpers (Task 5/6/8 naming) — reused for customer
   display-name/family labels (Task 6) and bookmark filtering (Task 8) so
   nothing re-derives classification from raw taxonomy strings again. */
export function isBakhoorHolder(p) {
  return isHolderProduct(p, normalize(p.name));
}
export function isBakhoor(p) {
  return isBakhoorProduct(p, normalize(p.name));
}
export function isFreshener(p) {
  return isFreshenerProduct(p);
}
export function isGiftSet(p) {
  return isGiftProduct(p, normalize(p.name));
}
export function isAttar(p) {
  return isAttarProduct(p);
}
export function isPerfume(p) {
  return isPerfumeProduct(p);
}

/* The ONLY pool the `floating` resolver may draw from for a
   non-name-matched product. Backed by TRANSPARENT_POOL, which every entry
   was verified against with a real PIL alpha-channel + border audit (see
   scripts/verify_floating_alpha.py) — RGBA mode, >=8% low/zero-alpha
   pixels, >=40% of the outer-border ring transparent. All 9 entries
   PASSED; nothing here is filename-trusted. */
const BOOK_FLOATING_ASSETS = TRANSPARENT_POOL;

/* `floating` context — the Book's physically-rising bottle.

   HARD RULE (this pass, supersedes the previous session's "silhouette
   beats wrong transparency" tradeoff): the floating bottle must be
   PROGRAMMATICALLY-VERIFIED alpha-transparent, always, with zero
   exceptions — not "usually", not "unless the family has no transparent
   art". Every candidate this function can possibly return was checked with
   a real PIL alpha-channel/border audit (RGBA, meaningful proportion of
   low/zero-alpha pixels, transparent outer border) — see
   BOOK_FLOATING_ASSETS below, which is the ONLY pool this function may
   draw from. It is structurally incapable of returning anything outside
   that set: there is no code path here that reaches HOLDERS/BAKHOOR_POOL/
   FRESHENER/GIFTS or any `rule.image` special photograph — those opaque
   family photographs are real and still used, but ONLY by the
   `editorial`/`thumb` contexts below, never by `floating`.

   Classification precedence is still run in full (special -> holder ->
   bakhoor -> freshener -> gift -> attar -> perfume -> fallback) so the
   *choice of transparent asset* can still special-case a confidently
   name-matched product (moon/skull/cowboy/turquoise have their own
   verified-transparent cutout); every other family — including
   holder/bakhoor/freshener/gift, which have NO transparent photography at
   all — falls through to the verified generic transparent pool rather than
   ever showing its opaque family photo as the rising bottle. */
function resolveFloatingVisual(p, name, seed) {
  const classified = classifyProduct(p, name);

  if (classified.kind === "special") {
    const rule = classified.rule;
    if (FLOATING_SPECIAL[rule.variant]) {
      return {
        primary: FLOATING_SPECIAL[rule.variant],
        secondary: null,
        family: "special-transparent",
        variant: `${rule.variant}-transparent`,
        objectPosition: "center",
        scale: 1,
        transparent: true,
        sourceReason: `floating-special-transparent-match:${rule.tokens[0]}`,
      };
    }
    // No verified-transparent cutout exists for this special name (e.g.
    // ice/bleu/hudson-valley/tygar/charminar/night-oud) — fall through to
    // the verified generic transparent pool below rather than the opaque
    // special photograph.
  }

  // holder / bakhoor / freshener / gift / attar / perfume / fallback /
  // special-without-a-transparent-cutout: every one of these draws ONLY
  // from BOOK_FLOATING_ASSETS (verified alpha-transparent), keyed by a
  // stable per-product hash so the same product always renders the same
  // bottle across reloads.
  return {
    primary: pickFromPool(BOOK_FLOATING_ASSETS, seed),
    secondary: null,
    family: "transparent-pool",
    variant: "floating-general",
    objectPosition: "center",
    scale: 1,
    transparent: true,
    sourceReason: `floating-transparent-pool-hash:${classified.kind}`,
  };
}

/* `thumb` context — small thumb-context imagery (search results, tray
   rows, related lists). Spec: prefer a genuinely transparent asset for a
   cleaner small-scale render, else fall through to the same editorial
   resolution used everywhere else (never legacy — legacy is fully removed,
   this is purely a pool-preference choice). Reuses the exact special
   transparent match logic from the floating resolver so a special-named
   product's thumb never disagrees with its floating bottle. */
function resolveThumbVisual(p, name, seed) {
  for (const rule of SPECIAL_RULES) {
    if (FLOATING_SPECIAL[rule.variant] && rule.tokens.some((t) => hasToken(name, t))) {
      return {
        primary: FLOATING_SPECIAL[rule.variant],
        secondary: null,
        family: "special-transparent",
        variant: `${rule.variant}-transparent`,
        objectPosition: "center",
        scale: 1,
        transparent: true,
        sourceReason: `thumb-special-transparent-match:${rule.tokens[0]}`,
      };
    }
  }
  return null; // signal: fall through to the normal editorial resolution below
}

/* `detail` context — the dedicated Product Detail page's primary bottle
   image (Task/Phase 1 fix — confirmed VISUAL IDENTITY bug: Detail used to
   fall through to the default "editorial" resolution below, which draws
   its generic-family fallback from PERFUME_POOL (20 items) / ATTAR_POOL (5
   items) — a DIFFERENT pool, with a DIFFERENT length, than the
   TRANSPARENT_POOL (9 items) the Book's floating bottle draws from. Same
   product.id, same stableHash(seed), but `hash % 20` and `hash % 9` land on
   unrelated array indices — so Book and Detail silently disagreed on which
   bottle to show for the ~1400 non-special catalogue rows (reproduces the
   reported "1001 Nights Ultra Super" bug: Book ID === Detail ID, i.e. NOT a
   stale-state/navigation bug, but the two contexts independently resolving
   a different image for the identical settled product).

   Fix: Detail now shares ONE canonical identity with Book —
   - exact special-named products (moon/skull/cowboy/turquoise/ice/bleu/
     hudson-valley/tygar/charminar/night-oud) keep their own real opaque
     editorial photograph (`rule.image`) — the "exact editorial image for
     that product" the brief calls for; Book's floating transparent cutout
     of the SAME bottle (or, for the 6 without a verified transparent
     cutout, the shared generic transparent pool) is still visually the
     same identity, never a swap to another special/unrelated product.
   - every other product (holder/bakhoor/freshener/gift/attar/perfume/
     fallback) draws from the EXACT SAME BOOK_FLOATING_ASSETS pool with the
     EXACT SAME stableHash(seed) the floating context uses — guaranteeing
     pixel-identical continuity between what Book showed and what Detail
     opens to, every time, for every one of the 1468 real catalogue rows. */
function resolveDetailVisual(p, name, seed) {
  const classified = classifyProduct(p, name);

  if (classified.kind === "special") {
    const rule = classified.rule;
    return {
      primary: rule.image,
      secondary: null,
      family: rule.family,
      variant: rule.variant,
      objectPosition: "center",
      scale: 1,
      transparent: false,
      sourceReason: `detail-special-exact-match:${rule.tokens[0]}`,
    };
  }

  return {
    primary: pickFromPool(BOOK_FLOATING_ASSETS, seed),
    secondary: null,
    family: "transparent-pool",
    variant: "detail-book-continuity",
    objectPosition: "center",
    scale: 1,
    transparent: true,
    sourceReason: `detail-continuity-transparent-pool-hash:${classified.kind}`,
  };
}

export function resolveBookVisual(product, options) {
  const p = product || {};
  const name = normalize(p.name);
  const seed = p.id != null ? String(p.id) : p.slug || name;
  const context = options?.context || "editorial";

  if (context === "floating") {
    return resolveFloatingVisual(p, name, seed);
  }

  /* detail / thumb / editorial: deterministic CSV-driven catalogue image
     map is now the single source of truth for these contexts, keyed by
     product.id (see catalogueImageMap.js — generated from
     CATALOGUE_1468_FIXED_IMAGE_MAP.csv paired against
     `SELECT id, name FROM products ORDER BY id ASC`). No hashing/pool-
     rotation/Math.random involved — same product.id always resolves to the
     same asset in every one of these three contexts, so Detail/Search/
     Finder/Related/Featured/MostLoved/Notes/Header can never disagree with
     each other. `floating` (above) is untouched and keeps its own
     transparent-cutout pool system. */
  const catalogueImage = getCatalogueImage(p.id);
  if (catalogueImage) {
    return {
      primary: catalogueImage,
      secondary: null,
      family: "catalogue-map",
      variant: `catalogue-map:${context}`,
      objectPosition: "center",
      scale: 1,
      transparent: false,
      sourceReason: `catalogue-image-map-id:${p.id}`,
    };
  }

  if (context === "detail") {
    return resolveDetailVisual(p, name, seed);
  }

  if (context === "thumb") {
    const thumb = resolveThumbVisual(p, name, seed);
    if (thumb) return thumb;
    // no exact transparent match — continue into the normal editorial
    // resolution path below (special-name / keyword / type / category /
    // pool-hash), same as the default "editorial" context.
  }

  // 1. Special named products — word-boundary matching only (never raw
  // substring: "ice" must never match inside "Spice", etc.)
  for (const rule of SPECIAL_RULES) {
    if (rule.tokens.some((t) => hasToken(name, t))) {
      return {
        primary: rule.image,
        secondary: null,
        family: rule.family,
        variant: rule.variant,
        objectPosition: "center",
        scale: 1,
        transparent: false,
        sourceReason: `special-name-match:${rule.tokens[0]}`,
      };
    }
  }

  // 2. Product-name keyword mapping — freshener / gift / bakhoor-vs-holder
  if (isHolderProduct(p, name)) {
    const image = stableHash(seed) % 2 === 0 ? HOLDERS.holder1 : HOLDERS.holder2;
    return {
      primary: image,
      secondary: null,
      family: "holder",
      variant: "bukhoor-holder",
      objectPosition: "center",
      scale: 1,
      transparent: false,
      sourceReason: "holder-keyword-match",
    };
  }

  if (isBakhoorProduct(p, name)) {
    return {
      primary: pickFromPool(BAKHOOR_POOL, seed),
      secondary: null,
      family: "bakhoor",
      variant: "bakhoor",
      objectPosition: "center",
      scale: 1,
      transparent: false,
      sourceReason:
        "bakhoor-keyword-match (no dedicated bakhoor product photography was supplied — closest available reference used, holders never fall back to this)",
    };
  }

  if (p.type === "Air Freshener" || name.includes("air freshener") || name.includes("airfreshner")) {
    const isCitrusLemon = /\blemon\b/.test(name);
    const isOrange = /\borange\b/.test(name);
    let image;
    if (isCitrusLemon) image = FRESHENER.lemon;
    else if (isOrange) image = FRESHENER.orange;
    else image = stableHash(seed) % 2 === 0 ? FRESHENER.lemon : FRESHENER.orange;
    return {
      primary: image,
      secondary: null,
      family: "freshener",
      variant: isCitrusLemon ? "lemon" : isOrange ? "orange" : "alternating",
      objectPosition: "center",
      scale: 1,
      transparent: false,
      sourceReason: "freshener-scent-keyword-match",
    };
  }

  if (isGiftProduct(p, name)) {
    const image = stableHash(seed) % 2 === 0 ? GIFTS.blue : GIFTS.packs;
    return {
      primary: image,
      secondary: null,
      family: "gift",
      variant: "gift-set",
      objectPosition: "center",
      scale: 1,
      transparent: false,
      sourceReason: "gift-set-keyword-match",
    };
  }

  // 3/4. type + categories — attar / perfume allowlists (reused from InfiniteShelf.jsx)
  if (isAttarProduct(p)) {
    return {
      primary: pickFromPool(ATTAR_POOL, seed),
      secondary: null,
      family: "attar",
      variant: "attar-pool",
      objectPosition: "center",
      scale: 1,
      transparent: false,
      sourceReason: "type-or-category-attar-match",
    };
  }
  if (isPerfumeProduct(p)) {
    return {
      primary: pickFromPool(PERFUME_POOL, seed),
      secondary: null,
      family: "perfume",
      variant: "perfume-pool",
      objectPosition: "center",
      scale: 1,
      transparent: false,
      sourceReason: "type-or-category-perfume-match",
    };
  }

  // 5. Stable fallback — general perfume pool, never a false special identity
  return {
    primary: pickFromPool(PERFUME_POOL, seed),
    secondary: null,
    family: "perfume",
    variant: "perfume-pool-fallback",
    objectPosition: "center",
    scale: 1,
    transparent: false,
    sourceReason: "fallback-general-perfume-pool",
  };
}

export default resolveBookVisual;
