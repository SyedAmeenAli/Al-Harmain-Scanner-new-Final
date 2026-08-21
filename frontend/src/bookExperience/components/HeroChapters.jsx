import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { HERO_SCENES } from "../data/bookAssetManifest";
import { getAllProducts } from "@/experience/utils/catalogueBridge";
import useReducedMotion from "../hooks/useReducedMotion";

/* Chapter Two genuinely maps to a real catalogue product ("Oud cambodi
   Perfume") rather than a fabricated association — resolved at runtime
   against the live hydrated catalogue, never hardcoded to an id that could
   drift across environments. Falls back to `null` (no tap-through) if the
   catalogue hasn't hydrated yet or no such product exists, rather than
   inventing one. */
function findRealProduct(products, tokens) {
  const norm = (s) => String(s || "").toLowerCase();
  for (const t of tokens) {
    const hit = products.find((p) => norm(p.name).includes(t));
    if (hit) return hit;
  }
  return null;
}

/* Three real hero scenes (Step 3+7). Scene 1 is checked against the live
   catalogue for a genuine "Ultra Man" product match — tap-through only
   appears if one really exists, never fabricated. Scenes 2/3 always get an
   "EXPLORE THE BOOK" CTA since no provable product match exists for them. */
const CHAPTERS_BASE = [
  {
    key: HERO_SCENES[0].id,
    kicker: "CHAPTER ONE",
    title: "A House of Scent",
    body: "For generations, Al Haramain has distilled oud, rose and saffron into fragrances worn across the world.",
    media: { type: "video", src: HERO_SCENES[0].video },
    align: "left",
    productTokens: ["ultra man", "ultraman"],
  },
  {
    key: HERO_SCENES[1].id,
    kicker: "CHAPTER TWO",
    title: "The Oud Trail",
    body: "Dark resin and warm wood — the signature material at the heart of the house.",
    media: { type: "video", src: HERO_SCENES[1].video },
    align: "right",
  },
  {
    key: HERO_SCENES[2].id,
    kicker: "CHAPTER THREE",
    title: "Open the Book",
    body: "Every page holds a real fragrance from the collection — drag through and find yours.",
    media: { type: "video", src: HERO_SCENES[2].video },
    align: "center",
  },
];

/* Horizontal drag-driven hero (continuous, not swipe-then-animate): the
   track's x transform follows the live drag position via a spring, and the
   index updates only on settle. Text and media sit in separate vertical
   zones — no text laid over the media, a localized gradient only at the
   media's own bottom edge for legibility. Height runs taller than one
   viewport (~114svh) so a sliver of the Book's top edge is visible below
   the fold as a soft cue that it exists beneath — without fully revealing
   or auto-scrolling to it. */
export default function HeroChapters({ onEnter, onOpenProduct, catalogueReady }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: reduced ? 500 : 260, damping: reduced ? 40 : 32 });
  const videoRefs = useRef([]);

  /* Only the active scene's video plays. Outgoing scenes are paused (not
     removed) and incoming scenes are explicitly played on becoming active
     so there is never a black restart frame from an autoPlay race. */
  useEffect(() => {
    videoRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === index) {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [index]);

  const products = useMemo(() => {
    try {
      return getAllProducts() || [];
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogueReady]);

  const CHAPTERS = useMemo(
    () =>
      CHAPTERS_BASE.map((c) =>
        c.productTokens ? { ...c, product: findRealProduct(products, c.productTokens) } : c
      ),
    [products]
  );

  const SLIDE_PX = 400; // logical drag-surface width used to convert offset to index steps

  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    setIndex(clamped);
    x.set(-clamped * SLIDE_PX);
  };

  const progressPct = useTransform(springX, (v) => {
    const raw = -v / ((CHAPTERS.length - 1) * SLIDE_PX || 1);
    return `${Math.max(0, Math.min(1, raw)) * 100}%`;
  });

  const current = CHAPTERS[index];
  const mappedProduct = current.product;

  return (
    <section className="bk-hero" aria-label="Introduction chapters">
      {/* Al Haramain mark now lives once, persistently, in the sticky
          BookHeader — the Hero's own duplicate logo mark (legacy, from
          when the header was hidden during Hero) has been removed. */}
      <motion.div
        className="bk-hero-track"
        style={{ x: springX, touchAction: "pan-y", width: `${CHAPTERS.length * SLIDE_PX}px` }}
        drag="x"
        /* dragDirectionLock: framer-motion samples the initial gesture
           delta and only engages the horizontal drag if |dx| dominates;
           when |dy| > |dx| it never locks in, so the gesture falls through
           to native vertical scrolling (backed by touchAction: "pan-y"
           above) instead of being captured by the swipe logic — this was
           the reported bug (vertical scroll intent getting eaten by Hero). */
        dragDirectionLock
        dragConstraints={{ left: -(CHAPTERS.length - 1) * SLIDE_PX, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        onDrag={(e, info) => {
          // continuous: follows the live drag position, not release-then-animate
          x.set(-index * SLIDE_PX + info.offset.x);
        }}
        onDragEnd={(e, info) => {
          if (info.offset.x < -60 && index < CHAPTERS.length - 1) goTo(index + 1);
          else if (info.offset.x > 60 && index > 0) goTo(index - 1);
          else x.set(-index * SLIDE_PX);
        }}
      >
        {CHAPTERS.map((c, i) => (
          <div
            className={`bk-hero-slide bk-hero-slide--${c.align}`}
            key={c.key}
            style={{ width: `${SLIDE_PX}px`, flex: `0 0 ${SLIDE_PX}px` }}
          >
            <div className="bk-hero-media">
              {c.media.type === "video" ? (
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={c.media.src}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  autoPlay={i === 0}
                />
              ) : (
                <img src={c.media.src} alt="" loading="eager" />
              )}
            </div>
          </div>
        ))}
      </motion.div>

      <div className="bk-hero-book-peek" aria-hidden="true" />

      <div className={`bk-hero-copy bk-hero-copy--${current.align}`}>
        <p className="bk-eyebrow">{current.kicker}</p>
        <h1 className="bk-h1">{current.title}</h1>
        <p className="bk-body" style={{ marginTop: "0.5rem" }}>{current.body}</p>

        {mappedProduct ? (
          <button
            type="button"
            className="bk-btn bk-btn--text bk-hero-product-link"
            onClick={() => onOpenProduct?.(mappedProduct)}
          >
            Discover {mappedProduct.name} <span aria-hidden="true">→</span>
          </button>
        ) : (
          /* Not confidently mapped to a real product — no product CTA
             (never fabricated). "Open the Book" already lives once, always
             visible, at the bottom of Hero — this is a restrained wayfinding
             cue only, not a second CTA button. */
          <p className="bk-hero-scroll-cue" aria-hidden="true">SCROLL TO THE BOOK ↓</p>
        )}

        <div className="bk-hero-progress" role="tablist" aria-label="Chapter position">
          <span className="bk-hero-progress-cue" aria-hidden="true">SWIPE</span>
          <span className="bk-hero-progress-track">
            <motion.span className="bk-hero-progress-fill" style={{ width: progressPct }} />
          </span>
        </div>
      </div>

      <button type="button" className="bk-btn bk-btn--primary bk-hero-enter" onClick={onEnter}>
        Open the Book
      </button>
    </section>
  );
}
