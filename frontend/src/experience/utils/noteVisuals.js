/* noteVisuals — Phase 6 canonical ingredient-image resolver.

   Single source of truth merging the two previously-duplicated resolvers
   (experience/utils/ingredientAssets.js and
   bookExperience/data/resolveNoteVisual.js — both kept in place as thin
   wrappers around this file so existing callers, including ScentOrbit.jsx
   which is explicitly frozen this pass, keep their exact current
   behavior/signature).

   Only 8 real macro-photography assets exist in the supplied media
   (frontend/public/assets/notes|ingredients/note-*.png) — every other real
   catalogue note (see frontend/note-image-gap-report.md for the full
   frequency audit) has NO supplied image. Per the freeze on fabricating
   assets, resolveNoteVisual() for anything outside the 8 confirmed groups
   returns `{ image: null, key: null, confident: false }` — callers must
   render the premium placeholder disc (never a wrong ingredient photo,
   never a broken-image icon). */

const BASE = process.env.PUBLIC_URL || "";

const ASSET = {
  oud: `${BASE}/assets/notes/note-oud.png`,
  rose: `${BASE}/assets/notes/note-rose.png`,
  saffron: `${BASE}/assets/notes/note-saffron.png`,
  vanilla: `${BASE}/assets/notes/note-vanilla.png`,
  citrus: `${BASE}/assets/notes/note-citrus.png`,
  tobacco: `${BASE}/assets/notes/note-tobacco-leaf.png`,
  berries: `${BASE}/assets/notes/note-berries.png`,
  darkSpice: `${BASE}/assets/notes/note-dark-spice.png`,
};

/* Normalization + safe aliases — resolveNoteVisual("Bergamot") and
   resolveNoteVisual("bergamot") (and "Bergamot Oil", "Bergamot Absolute")
   all resolve to the same key. Deliberately conservative: an alias is only
   added when the underlying macro photo is genuinely that exact
   ingredient (never "close enough" — e.g. coffee is NOT aliased to
   darkSpice/tobacco just because both are dark/gourmand-adjacent; truffle
   is NOT aliased to darkSpice or vanilla just because both are gourmand —
   an unconfirmed ingredient falls through to the placeholder instead of
   ever showing a wrong photo). */
const ALIASES = {
  oud: ["oud", "agarwood", "agar wood", "oudh"],
  rose: ["rose", "rose absolute", "damask rose", "rose otto", "turkish rose", "bulgarian rose"],
  saffron: ["saffron"],
  vanilla: ["vanilla", "vanilla pod", "vanilla absolute", "bourbon vanilla", "madagascar vanilla"],
  citrus: ["lemon", "orange", "bergamot", "grapefruit", "citrus", "mandarin", "mandarin orange", "lime"],
  tobacco: ["tobacco", "tobacco leaf"],
  berries: ["raspberry", "blackberry", "berries", "red berries", "blackcurrant"],
  darkSpice: ["spice", "spices", "dark spice", "clove", "cinnamon"],
};

/* Compound ingredient names that contain a bare alias word (e.g. "orange")
   but are a genuinely different, botanically-distinct material (orange
   BLOSSOM is a floral absolute steam-distilled from the flower, not the
   citrus-peel oil "note-citrus.png" depicts) — matching them to that key's
   asset would be exactly the "wrong/unrelated ingredient image" bug the
   word-boundary check was meant to prevent, just one compound-phrase level
   up. Listed per-key; a note whose normalized text hits one of these
   patterns skips that key entirely and falls through (to another key, or
   to the honest placeholder) rather than borrowing that key's photo. */
const EXCLUDE = {
  // Any "<citrus fruit> blossom/flower" (orange blossom, lime blossom,
  // African orange flower, neroli — literally the same material as orange
  // blossom) is a floral absolute steam-distilled from the flower, not the
  // citrus-peel oil note-citrus.png depicts — matching the fruit-name alias
  // alone would show the wrong photo for a real, different ingredient.
  citrus: [/\bblossom\b/, /\bneroli\b/, /\bflower\b/],
};

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveNoteVisual(noteName) {
  const norm = normalize(noteName);
  if (!norm) return { image: null, key: null, confident: false };
  const excluded = (key) => (EXCLUDE[key] || []).some((re) => re.test(norm));
  for (const [key, aliases] of Object.entries(ALIASES)) {
    if (excluded(key)) continue;
    if (aliases.some((a) => norm === a)) {
      return { image: ASSET[key], key, confident: true };
    }
  }
  // Word-boundary containment (not raw substring) — e.g. "fresh citrus
  // burst" still resolves to citrus, but "loud" never false-matches "oud".
  for (const [key, aliases] of Object.entries(ALIASES)) {
    if (excluded(key)) continue;
    for (const a of aliases) {
      const re = new RegExp(`(^|\\s)${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
      if (re.test(norm)) return { image: ASSET[key], key, confident: true };
    }
  }
  return { image: null, key: null, confident: false };
}

/* Legacy-shape helper — same resolution, just returns a bare path/null
   (ingredientAssets.js's original signature) for call sites that only ever
   wanted the image URL, not the confidence metadata. */
export function getIngredientImage(noteName) {
  return resolveNoteVisual(noteName).image;
}

export default resolveNoteVisual;
