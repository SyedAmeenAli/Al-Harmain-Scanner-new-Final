/* Book Experience — single source of truth for normalized asset paths.
   All files here are COPIES of the originals in
   `Al Harmain Images and Videos/` (see public/assets/book-experience/MANIFEST.md
   for the exact source -> destination mapping). Nothing here reads from the
   original source folder at runtime. */

const BASE = `${process.env.PUBLIC_URL || ""}/assets/book-experience`;

export const INTRO = {
  logoMark: `${BASE}/intro/logo-mark.png`,
  logoVideo: `${BASE}/intro/logo-video.webm`,
};

/* Three real hero scenes (Steps 3+7). This pass replaced all three source
   clips with the finalized "Hero N Al Harmain.mp4" vertical (9:16) videos:
   Scene 1 = Ultra Man (rocky/masculine/powerful). Scene 2 = Bakhoor (lush
   natural environment, smoke/incense atmosphere). Scene 3 = Cowboy (warm
   desert/sand). Order is fixed 1->2->3 and must not be swapped. Legacy
   single-video keys kept only for any stray references; new code should use
   HERO_SCENES. */
export const HERO = {
  video: `${BASE}/hero/hero-video.mp4`,
  oud: `${BASE}/hero/hero-oud.jpeg`,
  third: `${BASE}/hero/hero-third.jpeg`,
};

export const HERO_SCENES = [
  {
    id: "ultraman",
    video: `${BASE}/hero/hero-scene-1.mp4`,
  },
  {
    id: "forest-gold",
    video: `${BASE}/hero/hero-scene-2.mp4`,
  },
  {
    id: "desert-cowboy",
    video: `${BASE}/hero/hero-scene-3.mp4`,
  },
];

export const BOOK = {
  openBook: `${BASE}/book/open-book.png`,
};

/* Book-turn frame sequence (Step 1/2, verified transparent — 9 frames,
   00 = resting open book, 08 = fully turned). Legacy/unused — superseded
   first by BOOK_TURN_FRAMES_73, now by BOOK_TURN_FRAMES below. Kept only as
   a fallback reference; not imported anywhere. */
export const BOOK_TURN_FRAMES_9_LEGACY = Array.from(
  { length: 9 },
  (_, i) => `${BASE}/book-turn/book-turn-0${i}.png`
);

/* Real page-turn footage (Step 3, prior pass) — kept only as a fallback
   reference; superseded below by the 73-frame PNG sequence, which is what
   FragranceBook.jsx actually renders now (continuous drag-scrub, matches
   the exact frame-to-progress mapping the spec calls for, and composites
   cleanly with the floating bottle/text layers, which a <video> element
   cannot do). */
export const BOOK_TURN_SCRUB_VIDEO = `${BASE}/book-turn/book-turn-scrub.mp4`;

/* THE current book-turn visual — 99 frames, matted (border-connected
   flood-fill background removal from the four frame edges only, preserving
   interior dark pixels such as the spine/cover/page-shadow that never touch
   the border) from a fresh single-page-turn extraction (99 frames, 3s/24fps,
   1280x720, source RGB with pure-black background — one physical page turn:
   rest -> lift -> curl -> cross spine -> land -> rest). frame-000 = resting
   open book, frame-098 = page fully turned and settled. Real alpha
   (border-connected flood fill, not a naive global chroma-key), identical
   1280x720 canvas across all 99 frames. Supersedes the prior 201-frame
   sequence (kept below only as a fallback reference — no longer imported by
   FragranceBook.jsx). The drag-to-frame mapping in FragranceBook.jsx is
   computed from this array's own length (`FRAME_COUNT =
   BOOK_TURN_FRAMES.length`), so swapping the frame count here needed no
   formula change. */
export const BOOK_TURN_FRAMES = Array.from(
  { length: 99 },
  (_, i) => `${BASE}/page-turn-single/frame-${String(i).padStart(3, "0")}.png`
);

/* Prior 201-frame matted sequence — retained on disk as a fallback
   reference only, not imported anywhere. */
export const BOOK_TURN_FRAMES_201_LEGACY = Array.from(
  { length: 201 },
  (_, i) => `${BASE}/page-turn-201/frame-${String(i).padStart(3, "0")}.png`
);

/* Prior 73-frame chroma-keyed sequence — retained on disk as a fallback
   reference only, not imported anywhere. */
export const BOOK_TURN_FRAMES_73 = Array.from(
  { length: 73 },
  (_, i) => `${BASE}/page-turn-final/frame-${String(i).padStart(3, "0")}.png`
);

export const NOTES = {
  citrus: `${BASE}/notes/macro-01.png`,
  rose: `${BASE}/notes/macro-02.png`,
  tobacco: `${BASE}/notes/macro-03.png`,
  oud: `${BASE}/notes/macro-04.png`,
  saffron: `${BASE}/notes/macro-05.png`,
  darkSpice: `${BASE}/notes/macro-06.png`,
  berries: `${BASE}/notes/macro-07.png`,
  vanilla: `${BASE}/notes/macro-08.png`,
};

/* General perfume pool — deterministic hash-selected, never a claimed
   special identity. Mixes photographed + transparent-bottle variants. */
export const PERFUME_POOL = [
  `${BASE}/bottles/perfume/perfume-normal.jpeg`,
  `${BASE}/bottles/perfume/perfume-02.jpeg`,
  `${BASE}/bottles/perfume/perfume-03.jpeg`,
  `${BASE}/bottles/perfume/perfume-04.jpeg`,
  `${BASE}/bottles/perfume/perfume-05.jpeg`,
  `${BASE}/bottles/perfume/perfume-07.jpeg`,
  `${BASE}/bottles/perfume/perfume-oud.jpeg`,
  `${BASE}/bottles/perfume/oud-perfume.jpeg`,
  `${BASE}/bottles/perfume/perfume-50ml-small.jpeg`,
  `${BASE}/bottles/perfume/marble-01.jpeg`,
  `${BASE}/bottles/perfume/marble-02.jpeg`,
  `${BASE}/bottles/perfume/marble-03.jpeg`,
  `${BASE}/bottles/perfume/marble-04.jpeg`,
  `${BASE}/bottles/perfume/marble-05.jpeg`,
  `${BASE}/bottles/perfume/marble-transparent-01.png`,
  `${BASE}/bottles/perfume/marble-transparent-02.png`,
  `${BASE}/bottles/perfume/marble-transparent-03.png`,
  `${BASE}/bottles/perfume/marble-transparent-04.png`,
  `${BASE}/bottles/perfume/marble-transparent-05.png`,
  `${BASE}/bottles/perfume/marble-transparent-06.png`,
  `${BASE}/bottles/perfume/glass-with-logo.png`,
];

export const ATTAR_POOL = [
  `${BASE}/bottles/attar/attar-01.jpeg`,
  `${BASE}/bottles/attar/attar-02.jpeg`,
  `${BASE}/bottles/attar/attar-03.jpeg`,
  `${BASE}/bottles/attar/attar-04.jpeg`,
  `${BASE}/bottles/attar/attar-05.jpeg`,
];

/* Real bakhoor product photography was not supplied — closest available
   reference used as a last-resort visual, never a bottle. See
   resolveBookVisual.js sourceReason for the honest disclosure of this gap. */
export const BAKHOOR_POOL = [`${BASE}/bottles/bakhoor/bakhoor-ref-01.jpeg`];

export const HOLDERS = {
  holder1: `${BASE}/bottles/holders/bukhoor-holder-01.jpeg`,
  holder2: `${BASE}/bottles/holders/bukhoor-holder-02.jpeg`,
};

export const FRESHENER = {
  lemon: `${BASE}/bottles/freshener/airfreshner-lemon.jpeg`,
  orange: `${BASE}/bottles/freshener/airfreshner-orange.jpeg`,
};

export const GIFTS = {
  blue: `${BASE}/bottles/gifts/gift-blue.jpeg`,
  packs: `${BASE}/bottles/gifts/gift-packs.jpeg`,
};

/* Named/special bottles — matched against real product names by
   resolveBookVisual.js. Each key is the normalized token used for matching. */
export const SPECIAL = {
  ice: `${BASE}/bottles/special/ice.jpeg`,
  bleu: `${BASE}/bottles/special/bleu.jpeg`,
  hudsonValley: `${BASE}/bottles/special/hudson-valley.jpeg`,
  moon: `${BASE}/bottles/special/moon.jpeg`,
  moonTransparent: `${BASE}/bottles/special/moon-no-bg.png`,
  nightOud: `${BASE}/bottles/special/night-oud.jpeg`,
  oud: `${BASE}/bottles/special/oud.jpeg`,
  tygar: `${BASE}/bottles/special/tygar.jpeg`,
  ultraman: `${BASE}/bottles/special/ultraman.jpeg`,
  ultramanTransparent: `${BASE}/bottles/special/ultraman-no-bg.png`,
  skull: `${BASE}/bottles/special/skull.jpeg`,
  skullOnMarble: `${BASE}/bottles/special/skull-on-marble.jpeg`,
  skullTransparent: `${BASE}/bottles/special/skull-transparent.png`,
  cowboy: `${BASE}/bottles/special/cowboy.jpeg`,
  cowboyTransparent: `${BASE}/bottles/special/cowboy-no-bg.png`,
  cowboyHat: `${BASE}/bottles/special/cowboy-transparent.png`,
  charminar: `${BASE}/bottles/special/charminar.jpeg`,
  turquoise: `${BASE}/bottles/special/turquoise-with-logo.jpeg`,
  turquoiseTransparent: `${BASE}/bottles/special/turquoise-transparent.png`,
  redGlass: `${BASE}/bottles/special/red-glass.jpeg`,
  crownTransparent: `${BASE}/bottles/special/crown-transparent.png`,
  purpleJarTransparent: `${BASE}/bottles/special/purple-jar-transparent.png`,
};

/* Strictly transparent-background bottle pool — every file here was
   verified (PIL alpha-channel histogram, see final report) to genuinely
   have an alpha-transparent background, not a mislabeled white background.
   This is the ONLY pool `resolveBookVisual(product, { context: "floating" })`
   is allowed to draw from — the book's floating bottle must never resolve
   to a photographic/opaque asset. General (non-special-name) transparent
   pool — the 4 special-name exact transparent matches (moon/skull/cowboy/
   turquoise, see FLOATING_SPECIAL below) are reserved out of this list so
   a special-named product never double-resolves. */
/* Audited (this pass) to contain ONLY plain/neutral bottle shapes — no
   visually distinctive/named silhouettes. `crown-transparent` and
   `purple-jar-transparent` are generic decorative bottle *shapes* (no name
   token maps to them, they're not claimed as any specific product's
   identity) so they stay; `cowboy-no-bg` and `ultraman-no-bg` were REMOVED
   — those are the exact special-named bottles and belong only in
   FLOATING_SPECIAL below, selectable ONLY via a confident name match, never
   via this generic hash-selected pool (this was bug #6 — Cowboy/Ultraman
   leaking onto unrelated ordinary products). */
export const TRANSPARENT_POOL = [
  `${BASE}/bottles/perfume/marble-transparent-01.png`,
  `${BASE}/bottles/perfume/marble-transparent-02.png`,
  `${BASE}/bottles/perfume/marble-transparent-03.png`,
  `${BASE}/bottles/perfume/marble-transparent-04.png`,
  `${BASE}/bottles/perfume/marble-transparent-05.png`,
  `${BASE}/bottles/perfume/marble-transparent-06.png`,
  `${BASE}/bottles/perfume/glass-with-logo.png`,
  `${BASE}/bottles/special/crown-transparent.png`,
  `${BASE}/bottles/special/purple-jar-transparent.png`,
];

/* Exact special-name -> transparent-asset matches for the floating context
   only. Reuses the same SPECIAL_RULES tokens from resolveBookVisual.js. */
export const FLOATING_SPECIAL = {
  moon: SPECIAL.moonTransparent,
  skull: SPECIAL.skullTransparent,
  cowboy: SPECIAL.cowboyTransparent,
  turquoise: SPECIAL.turquoiseTransparent,
};

export default {
  INTRO,
  HERO,
  HERO_SCENES,
  BOOK,
  BOOK_TURN_FRAMES,
  BOOK_TURN_FRAMES_201_LEGACY,
  BOOK_TURN_FRAMES_73,
  BOOK_TURN_SCRUB_VIDEO,
  NOTES,
  PERFUME_POOL,
  ATTAR_POOL,
  BAKHOOR_POOL,
  HOLDERS,
  FRESHENER,
  GIFTS,
  SPECIAL,
  TRANSPARENT_POOL,
  FLOATING_SPECIAL,
};
