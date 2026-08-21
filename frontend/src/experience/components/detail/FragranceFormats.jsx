import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* PHASE L.2 · 05 FORMATS
   Informational only — no quantity selector, no purchase control.
   Omitted entirely when the catalogue carries no size data. Selecting a
   chip only indicates "viewing this format", never a purchase intent. */

function sizeLabel(s) {
  return s.label || (s.volumeMl ? `${s.volumeMl} ML` : "");
}

function sizePrice(s, currency) {
  if (s.price == null) return null;
  return `${currency || ""} ${s.price}`.trim();
}

export default function FragranceFormats({ product }) {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState(0);
  if (!product.sizes || !product.sizes.length) return null;

  return (
    <section className="ahx-d-formats" aria-label="Available formats">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12% 0px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="ahx-d-section-eyebrow">
          <span className="ahx-d-section-num">05</span>FORMATS
        </span>
        <ul className="ahx-d-format-list">
          {product.sizes.map((s, i) => {
            const price = sizePrice(s, product.currency);
            return (
              <li key={sizeLabel(s) || i}>
                <button
                  type="button"
                  className={`ahx-d-format${selected === i ? " is-selected" : ""}`}
                  onClick={() => setSelected(i)}
                  aria-pressed={selected === i}
                >
                  <span>{sizeLabel(s)}</span>
                  {price && <span className="ahx-d-format-price">{price}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </section>
  );
}
