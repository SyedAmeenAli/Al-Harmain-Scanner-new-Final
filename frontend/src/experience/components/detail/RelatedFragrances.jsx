import React, { useMemo, useState } from "react";
import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { getRelated, bottleFor } from "../../utils/catalogueBridge";

/* PHASE G · 7. RELATED / SIMILAR FRAGRANCES
   An intimate horizontal trail of real bottles, linked by defensible
   metadata (shared family / category / notes). No "92% match" fiction. */

const defaultMeta = (p) => [p.category, p.family].filter(Boolean).join(" · ");

export default function RelatedFragrances({
  product,
  onOpen,
  resolveImage = bottleFor,
  resolveMeta = defaultMeta,
  resolveName = (p) => p.name,
}) {
  const reduced = useReducedMotion();
  const related = useMemo(() => getRelated(product, 7), [product]);

  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 400, damping: 40 });
  const SLIDE_PX = 142; // width(124) + gap(18)

  if (!related.length) return null;

  const goTo = (i) => {
    setIndex(i);
    x.set(-i * SLIDE_PX);
  };

  return (
    <section className="ahx-d-related" aria-label="Related fragrances">
      <span className="ahx-d-section-eyebrow">
        <span className="ahx-d-section-num">06</span>RELATED
      </span>
      <p className="ahx-d-related-sub">Explore by what they share — family, type, or material.</p>

      <div style={{ overflow: "hidden", padding: "16px 0", margin: "0 -1.5rem" }}>
        <motion.div
          className="ahx-d-related-trail"
          style={{ 
            x: springX, 
            touchAction: "pan-y", 
            display: "flex", 
            gap: "18px", 
            paddingLeft: "calc(50% - 62px)", 
            paddingRight: "calc(50% - 62px)",
            margin: 0,
            overflow: "visible" 
          }}
          drag={reduced ? false : "x"}
          dragConstraints={{ left: -(related.length - 1) * SLIDE_PX, right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDrag={(e, info) => x.set(-index * SLIDE_PX + info.offset.x)}
          onDragEnd={(e, info) => {
            if (info.offset.x < -40 && index < related.length - 1) goTo(index + 1);
            else if (info.offset.x > 40 && index > 0) goTo(index - 1);
            else x.set(-index * SLIDE_PX);
          }}
        >
          {related.map((p, i) => {
            const isActive = i === index;
            return (
              <button
                key={p.id}
                type="button"
                className={`ahx-d-related-item${isActive ? " is-active" : ""}`}
                onClick={() => onOpen(p)}
                style={{
                  opacity: isActive ? 1 : 0.5,
                  transition: reduced ? "none" : "opacity 0.3s ease",
                  flex: "0 0 auto",
                  width: "124px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "center",
                  position: "relative",
                  zIndex: isActive ? 2 : 1
                }}
                aria-label={`Open ${p.name}`}
              >
                <span className="ahx-d-related-bottle">
                  <img 
                    src={resolveImage(p, "medium")} 
                    alt="" 
                    loading="eager" 
                    decoding="sync" 
                  />
                </span>
                <span className="ahx-d-related-name">{resolveName(p)}</span>
                <span className="ahx-d-related-meta">
                  {resolveMeta(p)}
                </span>
              </button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
