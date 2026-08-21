import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getAllProducts, formatPrice } from "../experience/utils/catalogueBridge";
import { resolveBookVisual } from "../bookExperience/data/resolveBookVisual";
import { getCustomerFamily } from "../bookExperience/data/productDisplay";

/**
 * Phase C — 360° Scent Orbit (THE SCENT RING).
 * A true elliptical orbit of INGREDIENT visuals only. No perfume bottles.
 * Drag to rotate (with gentle inertia), nearest note settles to foreground,
 * tap a note to physically rotate it forward. Active note shown in a calm
 * text-only detail area below the stage.
 */

import { getIngredientImage } from "../experience/utils/ingredientAssets";

// Short character tags for the bottom detail area
const NOTE_TAGS = {
  rose: ["Velvety", "Floral", "Rich", "Romantic"],
  oud: ["Deep", "Resinous", "Woody", "Dark"],
  amber: ["Warm", "Golden", "Resinous", "Sweet"],
  musk: ["Skin-like", "Intimate", "Enduring", "Soft"],
  vanilla: ["Creamy", "Sweet", "Comforting", "Warm"],
  bergamot: ["Bright", "Citrus", "Elegant", "Lifted"],
  honey: ["Golden", "Sweet", "Syrupped", "Warm"],
  saffron: ["Spicy", "Leathery", "Golden", "Rare"],
  jasmine: ["Sweet", "Indolic", "Night", "Heady"],
  citrus: ["Bright", "Sparkling", "Fresh", "First light"],
  lemon: ["Sharp", "Clean", "Zesty", "Pure"],
  patchouli: ["Earthy", "Dark", "Grounding", "Deep"],
  sandalwood: ["Creamy", "Woody", "Meditative", "Smooth"],
  cedar: ["Dry", "Woody", "Pencil-sharp", "Clean"],
  coffee: ["Roasted", "Dark", "Bitter", "Bean"],
  tobacco: ["Dry", "Sweet", "Hay-like", "Cured"],
  leather: ["Animalic", "Smoky", "Dry", "Tanned"],
  spice: ["Warm", "Piquant", "Aromatic", "Lively"],
  incense: ["Smoky", "Resinous", "Sacred", "Still"],
  berries: ["Juicy", "Tart", "Bright", "Playful"],
  "dark spice": ["Warm", "Piquant", "Aromatic", "Lively"],
};

function getTags(note) {
  return NOTE_TAGS[note.toLowerCase()] || [note];
}

// Curated presentation copy for the 8 ring ingredients — one concise
// sensory line each. Presentation copy, not product data: never sourced
// from or claiming to be a per-product fact.
const SENSORY_LINES = {
  oud: "Dark resin, smoky wood, warm depth.",
  rose: "Velvety petals, rich and romantic.",
  saffron: "Spiced gold, leathery and rare.",
  vanilla: "Creamy warmth, softly comforting.",
  berries: "Juicy and tart, playful on the first breath.",
  citrus: "Bright peel, sparkling and lifted.",
  tobacco: "Dry hay, cured and quietly sweet.",
  "dark spice": "Warm clove and cinnamon, aromatic and alive.",
};

function getSensoryLine(note) {
  return SENSORY_LINES[note.toLowerCase()] || getTags(note).join(" · ");
}

/* Curated presentation ingredients for the Scent Ring. This is a fixed set of
   8 — the ring is a visual archive of the house's signature raw materials,
   not a per-product note list, so it always renders regardless of which
   products happen to be hydrated. Each entry's `aliases` match against real
   catalogue note strings (product.allNotes) to surface real matching
   fragrances below the ring. Mirrors the alias groups in ingredientAssets.js. */
const CURATED_INGREDIENTS = [
  { note: "Oud", layer: "ingredient", aliases: ["oud", "agarwood", "agar wood"] },
  { note: "Rose", layer: "ingredient", aliases: ["rose", "rose absolute", "damask rose"] },
  { note: "Saffron", layer: "ingredient", aliases: ["saffron"] },
  { note: "Vanilla", layer: "ingredient", aliases: ["vanilla", "vanilla pod", "vanilla absolute"] },
  { note: "Berries", layer: "ingredient", aliases: ["raspberry", "blackberry", "berries", "red berries"] },
  { note: "Citrus", layer: "ingredient", aliases: ["lemon", "orange", "bergamot", "grapefruit", "citrus"] },
  { note: "Tobacco", layer: "ingredient", aliases: ["tobacco", "tobacco leaf"] },
  { note: "Dark Spice", layer: "ingredient", aliases: ["spice", "spices", "dark spice", "clove", "cinnamon"] },
];

const ORBIT_RADIUS = 42; // % of stage half-width
const ORBIT_CENTER = 50; // %

// Auto-rotation: a full 360° turn roughly every 44s (within the 35-60s
// spec range), driven by requestAnimationFrame at a tiny constant rate —
// same mechanism as the existing fling/spin animation, not a tick-tick timer.
const AUTO_DEG_PER_SEC = 360 / 44;
const RESUME_DELAY_MS = 3000; // resume ~2-4s after interaction ends

export default function ScentOrbit({ onExploreNote, onOpenProduct }) {
  const reduced = useReducedMotion();
  const containerRef = useRef(null);
  const [active, setActive] = useState(null);
  const [orbitalAngle, setOrbitalAngle] = useState(0);
  const angleRef = useRef(0);
  const spinRaf = useRef(null);

  // Auto-rotation state — refs (not React state) so the rAF loop can read
  // them every frame without re-subscribing; `autoPaused` is exposed as
  // state only for testability / a visible paused affordance if ever needed.
  const interactingRef = useRef(false);
  const inViewRef = useRef(false);
  const resumeTimerRef = useRef(null);
  const [autoPaused, setAutoPaused] = useState(false);
  // Tracks the last "settled nearest note" index so the auto-rotation loop
  // only calls setActive when the nearest note actually changes — same
  // discrete gate as the drag-release snapToNearest, never on every small
  // angle delta (Part 4: prevents the featured-perfume panel from flickering
  // every animation frame during the ~44s auto-spin).
  const autoActiveIndexRef = useRef(0);

  const setAngle = (v) => {
    angleRef.current = v;
    setOrbitalAngle(v);
  };

  const pauseAuto = () => {
    interactingRef.current = true;
    setAutoPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const scheduleResume = (delay = RESUME_DELAY_MS) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      interactingRef.current = false;
      setAutoPaused(false);
    }, delay);
  };

  // In-view detection — auto-rotation only runs while the ring is visible.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      inViewRef.current = true; // fail open rather than never-rotate
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = !!entries[0]?.isIntersecting;
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The auto-rotation loop itself. Never starts under prefers-reduced-motion
  // (Part 26: reduced motion disables Scent Ring auto-rotation entirely).
  useEffect(() => {
    if (reduced) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (
        !interactingRef.current &&
        inViewRef.current &&
        !document.hidden &&
        !spinRaf.current
      ) {
        setAngle(angleRef.current + AUTO_DEG_PER_SEC * dt);
        // Discrete "index changed" gate — mirrors snapToNearest's rounding,
        // but only ever calls setActive (and therefore only re-renders the
        // note-detail/featured-perfume panel) on a real index change, not
        // on every sub-degree tick.
        const noteCount = CURATED_INGREDIENTS.length;
        const anglePerNote = 360 / noteCount;
        const frontIndex = Math.round(-angleRef.current / anglePerNote);
        const nearestIndex = ((frontIndex % noteCount) + noteCount) % noteCount;
        if (nearestIndex !== autoActiveIndexRef.current) {
          autoActiveIndexRef.current = nearestIndex;
          setActive(CURATED_INGREDIENTS[nearestIndex]);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVisibility = () => {
      /* tick() already reads document.hidden every frame; nothing else to do */
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [reduced]);

  // Fixed curated ingredient ring — always 8, independent of any single
  // product's hydrated notes.
  const allNotes = CURATED_INGREDIENTS;
  const noteCount = allNotes.length;

  // Initialise the active note to the frontmost (angle 0), once.
  useEffect(() => {
    setActive(allNotes[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelSpin = () => {
    if (spinRaf.current) cancelAnimationFrame(spinRaf.current);
    spinRaf.current = null;
  };

  const snapToNearest = () => {
    if (noteCount === 0) return;
    const anglePerNote = 360 / noteCount;
    const nearestOrbitalAngle = Math.round(angleRef.current / anglePerNote) * anglePerNote;
    setAngle(nearestOrbitalAngle);
    
    const frontIndex = Math.round(-nearestOrbitalAngle / anglePerNote);
    const nearestIndex = ((frontIndex % noteCount) + noteCount) % noteCount;
    
    setActive(allNotes[nearestIndex] || null);
    autoActiveIndexRef.current = nearestIndex;
    scheduleResume();
  };

  // Gentle inertia after a fling, then snap
  const spin = (velocityX) => {
    let v = velocityX * 0.3; // deg / second
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (Math.abs(v) < 6) {
        snapToNearest();
        return;
      }
      setAngle(angleRef.current + v * dt);
      v *= Math.pow(0.12, dt); // smooth exponential decay
      spinRaf.current = requestAnimationFrame(tick);
    };
    spinRaf.current = requestAnimationFrame(tick);
  };

  // Tap a note → physically rotate the whole ring until it reaches foreground
  const rotateToNote = (targetNote) => {
    cancelSpin();
    pauseAuto();
    if (noteCount === 0) return;
    const index = allNotes.findIndex(
      (n) => n.note === targetNote.note && n.layer === targetNote.layer
    );
    if (index === -1) return;
    const anglePerNote = 360 / noteCount;
    const targetOrbitalAngle = -index * anglePerNote;
    
    let diff = (targetOrbitalAngle - angleRef.current) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    setAngle(angleRef.current + diff);
    setActive(targetNote);
    autoActiveIndexRef.current = index;
    scheduleResume();
  };

  const prevNext = (dir) => {
    cancelSpin();
    pauseAuto();
    setAngle(angleRef.current + dir * (360 / noteCount));
    // after a manual step, settle active to the new front
    setTimeout(snapToNearest, reduced ? 0 : 420);
  };

  // Compute positions for each note
  const notePositions = useMemo(() => {
    return allNotes.map((item, i) => {
      const angle = (i / noteCount) * 360 + orbitalAngle;
      const rad = (angle * Math.PI) / 180;
      const depth = Math.cos(rad); // -1 (back) to 1 (front)
      const x = ORBIT_CENTER + Math.sin(rad) * ORBIT_RADIUS;
      const y = ORBIT_CENTER + Math.cos(rad) * (ORBIT_RADIUS * 0.62);
      return { ...item, angle, rad, depth, x, y };
    });
  }, [allNotes, noteCount, orbitalAngle]);

  // Frontmost note (for subtle focal behaviour)
  const activeNote = useMemo(() => {
    if (!notePositions.length) return null;
    return notePositions.reduce((a, b) => (b.depth > a.depth ? b : a));
  }, [notePositions]);

  // Real catalogue products whose DB notes match the active ingredient's
  // alias group. Uses the already-hydrated catalogue (single bulk fetch),
  // not a per-ingredient network call.
  const allProducts = getAllProducts();
  const featuredProducts = useMemo(() => {
    if (!active?.aliases) return [];
    const aliasSet = active.aliases.map((a) => a.toLowerCase());
    return allProducts.filter((p) => {
      const all = (p.allNotes || []).map((x) => x.toLowerCase());
      return all.some((x) => aliasSet.some((alias) => x.includes(alias)));
    });
    // Phase L.2B Part 9 regression fix: this previously keyed only on
    // [active], so if it first ran before the catalogue finished hydrating
    // (real 1,468-product fetch is async) it cached an empty match list
    // forever — confirmed live ("Oud" showed "Featured in 0 fragrances"
    // despite real matches like new-york-oud-attar's "Agarwood (Oud)" note).
    // allProducts.length changes once hydration completes, which now
    // correctly invalidates the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, allProducts.length]);

  const featuredCount = featuredProducts.length;
  const heroProduct = featuredProducts[0] || null;
  const altProducts = featuredProducts.slice(1, 3);

  const layerWord = active ? "Signature Ingredient" : "";
  const sensoryLine = active ? getSensoryLine(active.note) : "";

  return (
    <div
      ref={containerRef}
      className="ahx-scent-orbit"
      role="region"
      aria-label="360 degree scent orbit"
      data-testid="scent-orbit"
      data-auto-paused={autoPaused ? "true" : "false"}
      data-orbit-angle={orbitalAngle}
    >
      <header className="ahx-orbit-head">
        <span className="ahx-orbit-eyebrow">The Scent Ring</span>
        <h2 className="ahx-orbit-title">Turn the Notes</h2>
      </header>

      <motion.div
        className="ahx-orbit-stage"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => {
          cancelSpin();
          pauseAuto();
        }}
        onDrag={(e, info) => setAngle(angleRef.current - info.delta.x * 0.3)}
        onDragEnd={(e, info) => {
          if (reduced) {
            snapToNearest();
            return;
          }
          if (Math.abs(info.velocity.x) > 80) spin(info.velocity.x);
          else snapToNearest();
        }}
        onPointerDown={pauseAuto}
        style={{ touchAction: "pan-y" }}
      >
        {/* faint focal core — decorative, not a bottle */}
        <div className="ahx-orbit-core" aria-hidden="true" />

        {/* subtle elliptical orbit guide */}
        <div className="ahx-orbit-ring" aria-hidden="true" />

        {/* Floating ingredient notes */}
        {notePositions.map((item, i) => {
          const { depth, x, y, note, layer } = item;
          const isActive = active?.note === note && active?.layer === layer;
          const isFront = activeNote?.note === note && activeNote?.layer === layer;

          const scale = 0.46 + Math.max(0, depth) * 0.74;
          const opacity = 0.28 + Math.max(0, depth) * 0.72;
          const zIndex = Math.round(10 + depth * 60);
          const blur = (isActive || isFront) ? 0 : (1 - Math.max(0, depth)) * 3.5;

          return (
            <div
              key={`${layer}-${i}`}
              className="ahx-orbit-node"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                zIndex,
                filter: `blur(${blur}px)`,
                transition: reduced ? "none" : "opacity 0.35s ease, filter 0.35s ease",
              }}
              onClick={() => rotateToNote(item)}
            >
              <button
                type="button"
                className={`ahx-orbit-btn${isActive ? " is-active" : ""}`}
                aria-label={note}
                aria-pressed={isActive}
                onFocus={() => {
                  pauseAuto();
                  scheduleResume();
                }}
              >
                {getIngredientImage(note) ? (
                  <div className="ahx-orbit-ingredient-wrapper">
                    <img
                      src={getIngredientImage(note)}
                      alt=""
                      className="ahx-orbit-ingredient-img"
                      loading="eager"
                      decoding="sync"
                    />
                  </div>
                ) : (
                  <div className="ahx-orbit-no-img">
                    <span className="ahx-orbit-no-img-text">{note}</span>
                  </div>
                )}
                {getIngredientImage(note) && <span className="ahx-orbit-label">{note}</span>}
              </button>
            </div>
          );
        })}

      </motion.div>

      {/* Bottom detail — asymmetric split: ~42% ingredient copy, ~58%
          one large real matched perfume + up to 2 smaller alternatives.
          Keyed AnimatePresence so a note change fades/slides the copy and
          crossfades+shifts the featured bottle, rather than a hard swap. */}
      <div className="ahx-orbit-detail ahx-orbit-detail--split">
        {active ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.note}
                className="ahx-orbit-detail-copy"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="ahx-orbit-detail-layer">{layerWord}</p>
                <h3 className="ahx-orbit-detail-name">{active.note}</h3>
                <p className="ahx-orbit-detail-sensory">{sensoryLine}</p>
                <p className="ahx-orbit-detail-count">
                  Featured in {featuredCount} {featuredCount === 1 ? "fragrance" : "fragrances"}
                </p>
                <button
                  type="button"
                  className="ahx-orbit-cta"
                  onClick={() => onExploreNote?.(active.note)}
                >
                  Explore this trail
                </button>
              </motion.div>
            </AnimatePresence>

            <div className="ahx-orbit-detail-feature">
              {heroProduct ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.button
                      key={heroProduct.id}
                      type="button"
                      className="ahx-orbit-feature-btn"
                      onClick={() => onOpenProduct?.(heroProduct)}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span className="ahx-orbit-feature-img-box">
                        <img src={resolveBookVisual(heroProduct, { context: "editorial" }).primary} alt="" loading="lazy" />
                      </span>
                      <span className="ahx-orbit-feature-name">{heroProduct.name}</span>
                      {formatPrice(heroProduct) && (
                        <span className="ahx-orbit-feature-price">{formatPrice(heroProduct)}</span>
                      )}
                    </motion.button>
                  </AnimatePresence>

                  {altProducts.length > 0 && (
                    <div className="ahx-orbit-samples">
                      {altProducts.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className="ahx-orbit-sample-item"
                          onClick={() => onOpenProduct?.(p)}
                        >
                          <span className="ahx-orbit-sample-img-box">
                            <img src={resolveBookVisual(p, { context: "editorial" }).primary} alt="" loading="lazy" />
                          </span>
                          <span className="ahx-orbit-sample-name">{p.name}</span>
                          {getCustomerFamily(p) && (
                            <span className="ahx-orbit-sample-meta">{getCustomerFamily(p)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="ahx-orbit-no-match">No matching fragrances currently carry this mapped note.</p>
              )}
            </div>
          </>
        ) : (
          <p className="ahx-orbit-hint">Drag to turn the ring, or tap a note.</p>
        )}
      </div>
    </div>
  );
}
