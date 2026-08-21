import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { getAllProducts, formatPrice } from "@/experience/utils/catalogueBridge";
import { BOOK_CURATED_PRODUCTS } from "../data/bookCuratedProducts";
import { BOOK_TURN_FRAMES } from "../data/bookAssetManifest";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";
import { parseFragranceNotes } from "@/experience/utils/noteParsing";
import FloatingBottle from "./FloatingBottle";
import useReducedMotion from "../hooks/useReducedMotion";

// Frame count is read from the manifest array's own length, never hardcoded
// here — so swapping the frame sequence (e.g. the 73-frame set for the
// current 201-frame set) never requires touching this math.
const FRAME_COUNT = BOOK_TURN_FRAMES.length; // 201
const LAST_FRAME = FRAME_COUNT - 1; // 200
const TURN_WIDTH = 320; // px drag distance mapped to one full page turn (progress 0..1)

/* Preloads all frames into the browser image cache once, the first time
   it's called (module-level guard) — so re-entering the section never
   re-triggers the network fetch. */
let framesPreloaded = false;
function preloadFrames() {
  if (framesPreloaded) return;
  framesPreloaded = true;
  BOOK_TURN_FRAMES.forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  });
}

/* Preloads a single bottle/perfume image (module-level guard per-src so the
   same product's image is never re-requested). This is what was previously
   missing: the 99 page-turn frames were preloaded ahead of time, but the
   product bottle image was not — so frame 0 was always warm cache by the
   time the Book rendered, while the bottle was a cold first-time fetch,
   producing a visible "Book appears, perfume pops in a moment later" gap. */
const preloadedBottleSrcs = new Set();
function preloadBottleImage(src) {
  if (!src || preloadedBottleSrcs.has(src)) return;
  preloadedBottleSrcs.add(src);
  const img = new Image();
  img.decoding = "sync";
  img.src = src;
}

/* Fires preloadFrames() (and, if supplied, preloadBottleImage(bottleSrc))
   once the sentinel is within ~1.25 viewport heights of the viewport — i.e.
   while the visitor is still scrolling through Hero, not when the Book
   section itself becomes visible. Rendered as the first child of
   FragranceBook's own section (see below), which is what lets it receive
   the current product's resolved bottle image src to warm alongside the
   frames. */
export function BookPreloadSentinel({ bottleSrc } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      preloadFrames();
      preloadBottleImage(bottleSrc);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          preloadFrames();
          preloadBottleImage(bottleSrc);
          io.disconnect();
        }
      },
      { rootMargin: "125% 0px 125% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottleSrc]);
  return <div ref={ref} aria-hidden="true" style={{ height: 1 }} />;
}

/* The frame-by-frame drag-scrub sequence. `frameIndex` is a plain number (not a
   motion value) recomputed on every rAF tick from the live spring so the
   <img> swap tracks the drag continuously and reversibly; frames are drawn
   from the browser image cache (preloaded above) so swapping is just a
   src assignment, no decode stall. */
function BookTurnFrames({ progress, directionRef }) {
  const [frame, setFrame] = useState(0);
  const rafRef = useRef(null);
  const lastRef = useRef(-1);

  useEffect(() => {
    const tick = () => {
      const p = Math.max(0, Math.min(1, progress.get()));
      const dir = directionRef.current;
      const idx = dir >= 0
        ? Math.round(p * LAST_FRAME)          // forward: 0 -> 200
        : Math.round((1 - p) * LAST_FRAME);   // backward: 200 -> 0
      if (idx !== lastRef.current) {
        lastRef.current = idx;
        setFrame(idx);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bk-book-base" aria-hidden="true">
      <img className="bk-book-frame-img" src={BOOK_TURN_FRAMES[frame]} alt="" draggable={false} />
    </div>
  );
}

/* Pure function trace of the progress -> frame mapping: 0.00 -> frame-000,
   0.25 -> ~frame-050, 0.50 -> ~frame-100, 0.75 -> ~frame-150,
   1.00 -> frame-200 (LAST_FRAME, derived from BOOK_TURN_FRAMES.length so it
   always tracks whatever frame sequence is currently wired up). The mapping
   itself is unchanged by the settle-tween rework below — `turnProgress` (0..1)
   still drives this identically whether it's being set live by a drag or
   animated programmatically by `commitTurn`/`cancelTurn`. Exported for the
   QA trace. */
export function progressToFrame(p) {
  return Math.round(Math.max(0, Math.min(1, p)) * LAST_FRAME);
}

// Phase 1/Back-preservation fix: FragranceBook fully unmounts/remounts
// whenever a dedicated view (Detail/Tray/etc) becomes active (see
// BookExperience.jsx's exclusive-view branching) — a plain `useState(0)`
// would silently reset the visible page back to 001 on every Back tap,
// even though the spec requires "Book->Detail->Back returns Book
// location". Module-level cache (keyed by bookmark) survives the
// unmount/remount so the same page is showing again on return, without
// lifting index state up into BookExperience.
const bookIndexCache = new Map();

export default function FragranceBook({ onOpenProduct, bookmark, onBookmarkChange, catalogueReady }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(() => bookIndexCache.get(bookmark) ?? 0);
  // Task 5: while a drag/page-turn gesture is in flight, the hit-areas that
  // can navigate to a product (Discover, prev/next edges) are disabled via
  // pointer-events so a click can never land mid-gesture and read a
  // not-yet-settled product. Re-enabled the instant the gesture ends
  // (commitTurn already updates `index` synchronously before this flips
  // back), so the ONLY navigable target is always products[index] from the
  // current, settled render — never a resolved visual asset, never a stale
  // ref.
  const [isPageTurning, setIsPageTurning] = useState(false);

  // The Book is a small curated 15-product experience, completely
  // independent of the full 1468-row catalogue. BOOK_CURATED_PRODUCTS is
  // the ONLY product source — for each of its 15 hardcoded entries, the
  // REAL live product object (real name/price/sizes/notes/family) is
  // pulled from the existing catalogue bridge by slug, so every piece of
  // text the Book displays stays 100% real. The array is never widened by
  // a bookmark filter falling through to the full catalogue: if a filter
  // yields zero of the 15, `products` is legitimately empty and the
  // existing "No fragrances currently carry this real chapter" empty
  // state (below) renders — it must never fall back to all 1468 products.
  const curatedProducts = useMemo(() => {
    const all = getAllProducts();
    const bySlug = new Map(all.map((p) => [p.id, p]));
    return BOOK_CURATED_PRODUCTS.map((entry) => {
      const real = bySlug.get(entry.productSlug);
      if (!real) return null;
      // __bookImage carries the Book's own fixed transparent cutout —
      // the floating bottle reads this directly, never
      // resolveBookVisual(..., {context:"floating"})'s catalogue-wide
      // special/pool/hash logic, which no longer runs for the Book.
      return { ...real, __bookImage: entry.bookImage };
    }).filter(Boolean);
    // catalogueReady is a real dependency, not decorative: it flips once
    // when async hydration resolves, forcing this to recompute from the
    // now-populated catalogue (see BookExperience.jsx for why this is
    // needed — getAllProducts() itself has no pub/sub).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogueReady]);

  // Item 2: the old ALL/PERFUME/ATTAR/BAKHOOR/MORE category rail is gone —
  // the Book is a clean curated sequence now, so `products` is simply the
  // curated 15 (Item 3: still the ONLY source, never widened back to the
  // full catalogue). `bookmark`/`onBookmarkChange` props are still accepted
  // from BookExperience (harmless, unused) so no caller wiring had to move.
  const products = curatedProducts;

  useEffect(() => {
    if (index >= products.length) setIndex(0);
  }, [products.length, index]);

  useEffect(() => {
    bookIndexCache.set(bookmark, index);
  }, [bookmark, index]);

  // Direct (non-spring) 0..1 progress value — the single value driving the
  // 201-frame sequence AND the bottle sink/fade below. During a live drag
  // it is set 1:1 from the pointer offset every onDrag tick (no spring
  // smoothing, so no lag between finger and frame). On release/commit or on
  // button/key nav, `animate()` (a plain non-bouncy tween, not a spring)
  // drives it programmatically. A spring was the root cause of the
  // page-scrub-backward bug: `dragX` (a spring) was snapped straight to 0
  // after every committed turn, and because a spring animates toward its
  // new target from wherever it physically was, it visibly played the
  // frame sequence backward (200->0) immediately after every turn. Nothing
  // in this file uses a spring for turnProgress anymore.
  const turnProgress = useMotionValue(0);
  // Tracks which way the frame sequence should visually play: 1 = forward
  // (0->200, "next" semantics), -1 = backward (200->0, "prev" semantics).
  // Plain ref (not state) — read inside BookTurnFrames' rAF tick, doesn't
  // need to trigger a re-render itself.
  const dragDirRef = useRef(1);
  const turnAnimRef = useRef(null);
  const stopTurnAnim = () => {
    if (turnAnimRef.current) {
      turnAnimRef.current.stop();
      turnAnimRef.current = null;
    }
  };

  // Bottle timing tied to drag progress (spec): 0-15% elevated, 15-35%
  // sinking, 35-48% sinking+fading, >=48% invisible through the rest of
  // the turn.
  const bottleOpacity = useTransform(turnProgress, [0, 0.15, 0.35, 0.48], [1, 1, 0.45, 0], { clamp: true });
  const bottleRise = useTransform(turnProgress, [0, 0.15, 0.48], [1, 1, 0], { clamp: true });

  const active = products[index];

  // Forward/backward settle-to-completion tween — the ONLY way `index` ever
  // changes (drag-release commit, prev/next buttons, and arrow keys all
  // funnel through this one function, so all three feel identical). Always
  // animates turnProgress from wherever it currently sits UP to 1 (frame
  // 200) — monotonic, single-direction, easeOut, no spring/no overshoot —
  // then, only once that tween has fully finished, flips `index` and resets
  // turnProgress to 0 as a hard, non-animated cut (new page's resting
  // frame), never a scrub back through the sequence.
  const commitTurn = (direction) => {
    if (direction > 0 && index >= products.length - 1) return;
    if (direction < 0 && index <= 0) return;
    stopTurnAnim();
    // Set BEFORE starting the tween so a button/keyboard-triggered turn
    // (which never went through onDrag) still gets the correct visual
    // direction — direction > 0 = forward/next (0->200), else backward/prev
    // (200->0).
    dragDirRef.current = direction >= 0 ? 1 : -1;
    setIsPageTurning(true);
    turnAnimRef.current = animate(turnProgress, 1, {
      duration: 0.32,
      ease: "easeOut",
      onComplete: () => {
        setIndex((i) => Math.max(0, Math.min(products.length - 1, i + direction)));
        // Reset direction to forward BEFORE zeroing turnProgress — order
        // matters: with dragDirRef still -1, turnProgress=0 would compute
        // frame (1-0)*LAST = 200 (backward mapping), not the required
        // resting frame 0 for the new page.
        dragDirRef.current = 1;
        turnProgress.set(0);
        setIsPageTurning(false);
        turnAnimRef.current = null;
      },
    });
  };

  // Incomplete-gesture return-to-rest — legitimate single-direction ease
  // back down to frame 0 (no bounce/overshoot past 0), no index change.
  const cancelTurn = () => {
    stopTurnAnim();
    setIsPageTurning(true);
    turnAnimRef.current = animate(turnProgress, 0, {
      duration: 0.22,
      ease: "easeOut",
      onComplete: () => {
        setIsPageTurning(false);
        turnAnimRef.current = null;
      },
    });
  };

  React.useEffect(() => {
    const onKey = (e) => {
      if (isPageTurning) return;
      if (e.key === "ArrowRight") commitTurn(1);
      else if (e.key === "ArrowLeft") commitTurn(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, index, isPageTurning]);

  // The Book's floating bottle image is now a fixed 1:1 assignment from
  // BOOK_CURATED_PRODUCTS (via curatedProducts' __bookImage above) — zero
  // randomness, zero pool selection. resolveBookVisual's floating-context
  // special/pool/hash logic no longer runs for the Book at all; it remains
  // untouched for Detail/Search/Finder/etc via its other contexts.
  const visual = active ? { primary: active.__bookImage } : null;

  if (!products.length || !active) {
    // Zero of the 15 curated products match this bookmark (e.g. Attar/
    // Bakhoor — none of the 15 classify into those families). Never falls
    // through to the full catalogue; shows the existing empty-state
    // message. Item 2: no bookmark/category rail rendered here anymore —
    // there is no filter left that could cause a zero-match state under
    // the curated 15 in the first place; this now only guards the brief
    // window before catalogue hydration resolves.
    return (
      <section className="bk-book-stage" id="bk-book" aria-label="The Fragrance Book">
        <p className="bk-eyebrow bk-book-eyebrow">THE BOOK OF FRAGRANCES</p>
        <p className="bk-body" style={{ margin: "auto", textAlign: "center" }}>
          No fragrances currently carry this real chapter.
        </p>
      </section>
    );
  }

  const price = formatPrice(active);
  // Phase 4: raw active.allNotes can carry unsplit heading fragments from
  // the source data ("Base notes are Mexican chocolate") — this is exactly
  // where the reported "Amber · Are Truffle · Bas..." broken preview
  // string came from. Route through the same cleaner Detail uses so the
  // Book page's own note preview never shows a broken pseudo-note either.
  const parsedActiveNotes = parseFragranceNotes(active);
  const notes = parsedActiveNotes.all.slice(0, 3);
  const sizes = (active.sizes || []).map((s) => s.label || (s.volumeMl ? `${s.volumeMl} ML` : null)).filter(Boolean);
  const metaLine = getCustomerFamily(active);

  return (
    <section className="bk-book-stage" id="bk-book" aria-label="The Fragrance Book">
      <BookPreloadSentinel bottleSrc={visual?.primary} />
      <p className="bk-eyebrow bk-book-eyebrow">THE BOOK OF FRAGRANCES</p>

      {/* Name/index/type block — ABOVE the book, with a guaranteed measured
          gap (margin, not absolute overlap) before the book photo starts. */}
      <div className="bk-book-title-block">
        <span className="bk-book-index">{String(index + 1).padStart(3, "0")} / {String(products.length).padStart(3, "0")}</span>
        <h2 className="bk-h2 bk-book-title">{getCustomerDisplayName(active)}</h2>
        {metaLine && <p className="bk-book-type">{metaLine}</p>}
      </div>

      <div className="bk-book-frame">
        <BookTurnFrames progress={turnProgress} directionRef={dragDirRef} />

        <div className="bk-book-bottle-zone">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={active.id}
              className="bk-book-bottle-enter"
              // Position (y) is owned entirely by FloatingBottle's own `rise`
              // transform below — this wrapper only handles the settle-in
              // opacity/scale so the two don't stack and push the bottle
              // above the book frame into the title block.
              initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={reduced ? { duration: 0.2 } : { delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <FloatingBottle
                image={visual?.primary}
                rise={reduced ? 1 : bottleRise}
                reduced={!!reduced}
                label={`Open ${getCustomerDisplayName(active)}`}
                onClick={
                  isPageTurning
                    ? undefined
                    : () => onOpenProduct(active, { source: "book-bottle" })
                }
              />
              <motion.div style={{ opacity: reduced ? 1 : bottleOpacity, position: "absolute", inset: 0 }} aria-hidden="true" />
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          className="bk-book-drag-surface"
          drag={reduced || isPageTurning ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          dragMomentum={false}
          style={{ touchAction: "pan-y" }}
          onDragStart={() => {
            stopTurnAnim();
            setIsPageTurning(true);
          }}
          onDrag={(e, info) => {
            // Direct 1:1 scrub, no spring — turnProgress tracks the pointer
            // offset live every tick. Magnitude stays direction-agnostic
            // (abs value) — the bottle-timing useTransforms downstream only
            // care about magnitude. Direction is tracked separately via
            // dragDirRef so the frame sequence visually plays the correct
            // way: offset.x < 0 == dragging toward "next" (forward, 0->200,
            // matches the commitTurn(1) branch below in onDragEnd);
            // offset.x > 0 == dragging toward "prev" (backward, 200->0,
            // matches the commitTurn(-1) branch).
            dragDirRef.current = info.offset.x < 0 ? 1 : -1;
            const raw = Math.abs(info.offset.x) / TURN_WIDTH;
            turnProgress.set(Math.min(1, raw));
          }}
          onDragEnd={(e, info) => {
            // Release threshold ~42-48% of TURN_WIDTH, boosted by velocity.
            const velocityBoost = Math.abs(info.velocity.x) > 500 ? 0.08 : 0;
            const threshold = TURN_WIDTH * (0.45 - velocityBoost);
            if (info.offset.x < -threshold && index < products.length - 1) commitTurn(1);
            else if (info.offset.x > threshold && index > 0) commitTurn(-1);
            else cancelTurn();
            // commitTurn/cancelTurn own isPageTurning's lifecycle from here
            // (they flip it back to false in their tween's onComplete), so
            // hit-areas stay disabled for the tween's full duration instead
            // of re-enabling instantly under a still-animating frame.
          }}
        />

        <button
          type="button"
          className="bk-book-edge bk-book-edge--prev"
          aria-label="Previous page"
          disabled={index === 0 || isPageTurning}
          style={isPageTurning ? { pointerEvents: "none" } : undefined}
          onClick={() => commitTurn(-1)}
        />
        <button
          type="button"
          className="bk-book-edge bk-book-edge--next"
          aria-label="Next page"
          disabled={index === products.length - 1 || isPageTurning}
          style={isPageTurning ? { pointerEvents: "none" } : undefined}
          onClick={() => commitTurn(1)}
        />
      </div>

      {/* Metadata — BELOW the book. Exactly one instance each of
          price/notes/sizes/Discover. */}
      <div className="bk-book-meta-block">
        {price && <p className="bk-book-price">{price}</p>}
        {sizes.length > 0 && <p className="bk-book-sizes">{sizes.join(" · ")}</p>}
        {notes.length > 0 && <p className="bk-book-notes-plain">{notes.join(" · ")}</p>}
        <button
          type="button"
          className="bk-btn bk-btn--text bk-book-discover"
          disabled={isPageTurning}
          style={isPageTurning ? { pointerEvents: "none" } : undefined}
          onClick={() => {
            // Settled product only — never pendingIndex/frame/asset id. See
            // module doc + Phase 1 audit.
            const settledProduct = active;
            const clickedProductId = settledProduct.id;
            if (process.env.NODE_ENV !== "production") {
              // eslint-disable-next-line no-console
              console.log(
                "BOOK DISCOVER",
                { settledId: settledProduct.id, settledName: settledProduct.name, clickedId: clickedProductId }
              );
            }
            onOpenProduct(settledProduct, { source: "book" });
          }}
        >
          Discover <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
