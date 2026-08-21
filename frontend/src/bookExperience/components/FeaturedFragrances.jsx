import React, { useMemo, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { getAllProducts, formatPrice } from "@/experience/utils/catalogueBridge";
import { resolveBookVisual } from "../data/resolveBookVisual";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";
import useReducedMotion from "../hooks/useReducedMotion";

const SLIDE_PX = 340;

/* One dominant item at a time, horizontal swipe (forward/backward), a small
   edge hint of the neighbor, no 01/03 counter — a thin progress line only.
   Real eligibility: `status === "popular"` (same isPopular && inStock flag
   MostLoved.jsx uses), not a fabricated curated list. Falls back to the
   first N real products if nothing is flagged popular yet, so the section
   never renders empty. */
export default function FeaturedFragrances({ onOpenProduct, catalogueReady }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: reduced ? 500 : 260, damping: reduced ? 40 : 32 });

  const items = useMemo(() => {
    const all = getAllProducts();
    const popular = all.filter((p) => p.status === "popular");
    return (popular.length ? popular : all.slice(0, 8)).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogueReady]);

  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    setIndex(clamped);
    x.set(-clamped * SLIDE_PX);
  };

  if (!items.length) return null;

  return (
    <section className="bk-featured" id="bk-featured" aria-label="Featured Fragrances">
      <p className="bk-eyebrow bk-featured-eyebrow">FEATURED FRAGRANCES</p>

      <motion.div
        className="bk-featured-track"
        style={{ x: springX, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: -(items.length - 1) * SLIDE_PX, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        onDrag={(e, info) => x.set(-index * SLIDE_PX + info.offset.x)}
        onDragEnd={(e, info) => {
          if (info.offset.x < -60 && index < items.length - 1) goTo(index + 1);
          else if (info.offset.x > 60 && index > 0) goTo(index - 1);
          else x.set(-index * SLIDE_PX);
        }}
      >
        {items.map((p, i) => {
          const visual = resolveBookVisual(p, { context: "editorial" });
          const price = formatPrice(p);
          // Item 8: only the settled active slide reads full-clarity; its
          // immediate neighbors get the blurred/low-opacity edge treatment
          // that hints swipeability, matching the existing single-dominant-
          // item carousel (no rebuild, no new arrow controls).
          const isPeek = i !== index;
          return (
            <div
              className={`bk-featured-slide${isPeek ? " bk-featured-slide--peek" : ""}`}
              key={p.id}
              style={{ width: SLIDE_PX }}
              aria-hidden={isPeek}
            >
              <button type="button" className="bk-featured-card" onClick={() => onOpenProduct(p)} tabIndex={isPeek ? -1 : 0}>
                <span className="bk-featured-img-box">
                  {visual?.primary && <img src={visual.primary} alt="" loading="lazy" />}
                </span>
                <div className="bk-featured-text-group">
                  <span className="bk-featured-name">{getCustomerDisplayName(p)}</span>
                  <span className="bk-featured-type">{getCustomerFamily(p)}</span>
                  {price && <span className="bk-featured-price">{price}</span>}
                </div>
              </button>
            </div>
          );
        })}
      </motion.div>

      <div className="bk-featured-progress" aria-hidden="true">
        <span className="bk-featured-progress-track">
          <span
            className="bk-featured-progress-fill"
            style={{ width: `${((index + 1) / items.length) * 100}%` }}
          />
        </span>
      </div>
    </section>
  );
}
