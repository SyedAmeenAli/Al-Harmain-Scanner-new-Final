import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { getAllProducts, bottleFor, formatPrice } from "../utils/catalogueBridge";

/**
 * Phase L.2B Part 3 — Most Loved, editorial redesign.
 * One dominant bottle per view: left column carries the editorial copy
 * (eyebrow / index / name / type-category / notes / price / text-link),
 * right/center carries a large real bottle that's allowed to overlap into
 * the copy area. Subtle previous/next hints sit at the viewport edges to
 * signal swipeability. Drag moves bottle + copy + index together as one
 * unit (translateX/scale/rotateY/opacity only — no spring bounce).
 *
 * Eligibility (isPopular && inStock) is untouched from prior phases: it is
 * exactly `p.status === "popular"`, which catalogueBridge.normalizeAny only
 * ever sets when the real API's isPopular flag is true. The previous
 * padding-in of 5 non-popular products has been removed here — it diluted
 * the real "most loved" set with items that were never actually flagged
 * popular, which is not this section's real editorial claim.
 */
/* `resolveImage(product, size)` defaults to the legacy `bottleFor` so the
   old customer experience (which mounts this component unchanged) keeps
   its exact original behavior. The Book Experience's MostLovedChapter
   wrapper passes resolveBookVisual (editorial context) instead, so no
   legacy `/assets/products/<id>/` path ever renders inside the new
   experience. */
export default function MostLoved({
  onOpenDetail,
  resolveImage = bottleFor,
  resolveName = (p) => p.name,
  resolveMeta = (p) => [p.type, p.category].filter(Boolean).join(" · "),
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const viewportRef = useRef(null);
  const x = useMotionValue(0);
  const dragStartIndex = useRef(0);

  // Real eligibility only — isPopular && inStock, via the shared status field.
  const loved = getAllProducts().filter((p) => p.status === "popular");

  useEffect(() => {
    if (index >= loved.length) setIndex(0);
  }, [loved.length, index]);

  const springX = useSpring(x, {
    stiffness: reduced ? 500 : 260,
    damping: reduced ? 40 : 34,
    mass: 0.9,
  });

  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(loved.length - 1, i));
    setIndex(clamped);
    x.set(0);
  };

  const active = loved[index];
  const prev = index > 0 ? loved[index - 1] : null;
  const next = index < loved.length - 1 ? loved[index + 1] : null;
  const price = active ? formatPrice(active) : null;
  const notes = active?.allNotes?.length ? active.allNotes.slice(0, 3) : [];
  const typeLine = active ? resolveMeta(active) : "";

  if (!loved.length) {
    return (
      <section className="ahx-loved" aria-label="Most Loved">
        <header className="ahx-loved-header">
          <h2 className="ahx-loved-title">Most Loved</h2>
        </header>
        <p className="ahx-loved-empty">No signatures currently marked most loved.</p>
      </section>
    );
  }

  return (
    <section className="ahx-loved" aria-label="Most Loved">
      <div className="ahx-loved-viewport" ref={viewportRef}>
        {/* Partial previous/next hints — real bottles, edge-clipped */}
        {prev && (
          <button
            type="button"
            className="ahx-loved-hint ahx-loved-hint-prev"
            aria-label={`Previous: ${prev.name}`}
            onClick={() => goTo(index - 1)}
          >
            <img src={resolveImage(prev, "medium")} alt="" loading="lazy" decoding="async" />
          </button>
        )}
        {next && (
          <button
            type="button"
            className="ahx-loved-hint ahx-loved-hint-next"
            aria-label={`Next: ${next.name}`}
            onClick={() => goTo(index + 1)}
          >
            <img src={resolveImage(next, "medium")} alt="" loading="lazy" decoding="async" />
          </button>
        )}

        <motion.div
          className="ahx-loved-stage"
          style={{ x: springX }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          dragMomentum={false}
          onDragStart={() => {
            dragStartIndex.current = index;
          }}
          onDragEnd={(e, info) => {
            const threshold = 60;
            if (info.offset.x <= -threshold && index < loved.length - 1) {
              goTo(index + 1);
            } else if (info.offset.x >= threshold && index > 0) {
              goTo(index - 1);
            } else {
              x.set(0);
            }
          }}
        >
          <motion.div
            key={active.id}
            className="ahx-loved-frame"
            initial={reduced ? false : { opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="ahx-loved-copy">
              <span className="ahx-loved-eyebrow">MOST LOVED</span>
              <span className="ahx-loved-index">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="ahx-loved-name">{resolveName(active)}</h3>
              {typeLine && <p className="ahx-loved-type">{typeLine}</p>}
              {notes.length > 0 && (
                <p className="ahx-loved-notes">{notes.join(" · ")}</p>
              )}
              {price && <p className="ahx-loved-price">{price}</p>}
              <button
                type="button"
                className="ahx-loved-explore"
                onClick={() => onOpenDetail?.(active)}
              >
                EXPLORE FRAGRANCE <span aria-hidden="true">→</span>
              </button>
            </div>

            <button
              type="button"
              className="ahx-loved-bottle-btn"
              aria-label={`Open ${active.name}`}
              onClick={() => onOpenDetail?.(active)}
            >
              <img
                className="ahx-loved-bottle-img"
                src={resolveImage(active, "medium")}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </button>
          </motion.div>
        </motion.div>
      </div>

      <div className="ahx-loved-dots" role="tablist" aria-label="Most Loved position">
        {loved.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`ahx-loved-dot${i === index ? " is-active" : ""}`}
            aria-label={`Go to ${p.name}`}
            aria-selected={i === index}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  );
}
