/* parseFragranceNotes — Phase 4.
   Root cause (confirmed via read-only SQLite audit of backend/data/
   alharamain.sqlite `notes` table, deleted_at IS NULL): the catalogue
   import produced a mix of clean single-ingredient rows ("Bergamot",
   "Sandalwood") AND rows where an entire unsplit heading+sentence fragment
   from the source CSV became one "note" (e.g. name
   'basenotesaremexicanchocolate', display 'base notes are Mexican
   chocolate'; 'middlenotesareorchid' -> 'middle notes are Orchid';
   'aretobaccoleafandspicynotes' -> 'are tobacco leaf and spicy notes').
   The backend is frozen (read-only) — these rows cannot be re-imported or
   edited server-side, so every consumer of product.top/heart/base/allNotes
   must run its labels through this cleaner before ever displaying them.

   parseFragranceNotes(product) reads the SAME already-grouped top/heart/
   base/general arrays the API returns (this IS the actual data shape —
   verified live, not guessed), then:
     1. Detects a heading fragment baked into the front of a label
        ("top/opening notes are/is/include(s)/:/-", "heart/middle notes…",
        "base/dry down/drydown notes…") and, when found, treats THAT as the
        authoritative layer for the note (even overriding whatever bucket
        the row happened to land in) — a "middle notes are Orchid" string
        found in ANY bucket is reassigned to heart, cleaned to "Orchid".
     2. Strips the heading + connective grammar, leading/trailing
        punctuation, collapses whitespace.
     3. Rejects tokens that reduce to bare structural words ("are", "is",
        "notes", "top", "heart", "base", "middle", "opening") — these are
        never displayed as ingredients.
     4. Dedupes case-insensitively within each bucket and in the flat list.
   Returns { grouped, top, heart, base, all }. `grouped` is true only when
   at least one of top/heart/base has a real entry after cleanup — when the
   source is just a flat/messy list with no trustworthy layer signal at
   all, grouped is false and callers must render one clean "FRAGRANCE
   NOTES" collection instead of inventing which notes are top/heart/base. */

const HEADING_RE =
  /^\s*(top|opening|heart|middle|base|dry\s*down|drydown)\s*note[s]?\b\s*(are|is|include[s]?)?\s*[:\-–—]?\s*/i;
const CONNECTIVE_RE = /^\s*(are|is|include[s]?)\s+/i;
const LEADING_PUNCT_RE = /^[\s:;,.\-–—•·]+/;
const TRAILING_PUNCT_RE = /[\s:;,.\-–—•·]+$/;

const JUNK_WORDS = new Set([
  "", "are", "is", "include", "includes", "notes", "note",
  "top", "heart", "base", "middle", "opening", "and", "with",
]);

function headingLayer(raw) {
  const m = /^\s*(top|opening|heart|middle|base|dry\s*down|drydown)\s*note[s]?\b/i.exec(String(raw || ""));
  if (!m) return null;
  const word = m[1].toLowerCase().replace(/\s+/g, "");
  if (word === "top" || word === "opening") return "top";
  if (word === "heart" || word === "middle") return "heart";
  if (word === "base" || word === "drydown") return "base";
  return null;
}

// Bare connective-only fragments with no heading noun ("are tobacco leaf
// and spicy notes") still need the leading "are"/"is" stripped even though
// there's no "X notes" heading to detect a layer from — these stay in
// whatever bucket the backend already assigned them to (no reassignment
// signal available), just cleaned.
export function cleanNoteLabel(raw) {
  let s = String(raw || "").trim();
  s = s.replace(HEADING_RE, "");
  s = s.replace(CONNECTIVE_RE, "");
  s = s.replace(LEADING_PUNCT_RE, "");
  s = s.replace(TRAILING_PUNCT_RE, "");
  // Tokenize on real separators only if the remainder still visibly bundles
  // several ingredients behind a comma/semicolon/bullet/middle-dot — but a
  // single already-atomic DB row normally has none of these, so this is a
  // no-op for the overwhelming majority of rows and only matters for the
  // rare row that still carries a delimiter after heading-stripping.
  s = s.replace(/\s+/g, " ").trim();
  // Trailing "notes"/"note" left dangling after heading-strip removed only
  // the layer word (e.g. "and spicy notes" -> "and spicy").
  s = s.replace(/\s+notes?$/i, "").trim();
  s = s.replace(/^and\s+/i, "").trim();
  return s;
}

function isJunk(s) {
  const l = s.toLowerCase().trim();
  return !l || JUNK_WORDS.has(l);
}

function dedupeCaseInsensitive(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/* Splits a single backend-provided label into one-or-more real separator-
   delimited tokens (commas/semicolons/bullets/middle dots) AFTER heading
   detection/cleanup — covers the rarer case where one DB row still bundles
   "A, B" together. Multiword ingredient phrases ("Mexican Chocolate",
   "Black Truffle") have no such separator inside them, so they pass
   through untouched — this never splits on a bare space. */
function tokenize(cleaned) {
  return cleaned
    .split(/\s*(?:,|;|·|•|•)\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseFragranceNotes(product) {
  const buckets = {
    top: Array.isArray(product?.top) ? product.top : [],
    heart: Array.isArray(product?.heart) ? product.heart : [],
    base: Array.isArray(product?.base) ? product.base : [],
    general: Array.isArray(product?.notes?.general) ? product.notes.general : [],
  };

  const out = { top: [], heart: [], base: [], all: [] };

  for (const [bucketName, labels] of Object.entries(buckets)) {
    for (const raw of labels) {
      if (!raw) continue;
      const detected = headingLayer(raw);
      const cleaned = cleanNoteLabel(raw);
      const tokens = tokenize(cleaned);
      const targetLayer = detected || (bucketName === "general" ? null : bucketName);
      for (const tok of tokens) {
        if (isJunk(tok)) continue;
        out.all.push(tok);
        if (targetLayer && out[targetLayer]) out[targetLayer].push(tok);
      }
    }
  }

  out.top = dedupeCaseInsensitive(out.top);
  out.heart = dedupeCaseInsensitive(out.heart);
  out.base = dedupeCaseInsensitive(out.base);
  out.all = dedupeCaseInsensitive(out.all);

  // Cross-bucket dedupe: some source rows carry a compounding parse defect
  // where the SAME plain (no-heading) note ends up copied into more than
  // one layer bucket by the backend (confirmed live on "Black Orchid" —
  // "Incense"/"Amber"/"Sandalwood" etc appear in top, heart AND base).
  // A note with no heading of its own has no real signal for which single
  // layer it belongs to, so showing it under every tab would be more
  // confusing than showing it once — keep only its first occurrence
  // (top > heart > base priority), never duplicate an ingredient across
  // tabs.
  const claimed = new Set();
  for (const layer of ["top", "heart", "base"]) {
    out[layer] = out[layer].filter((n) => {
      const key = n.toLowerCase();
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    });
  }

  const grouped = out.top.length + out.heart.length + out.base.length > 0;

  return { grouped, top: out.top, heart: out.heart, base: out.base, all: out.all };
}

export default parseFragranceNotes;
