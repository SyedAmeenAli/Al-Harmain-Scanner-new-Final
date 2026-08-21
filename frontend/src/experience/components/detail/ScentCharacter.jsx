import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getCustomerFamily } from "@/bookExperience/data/productDisplay";
import { parseFragranceNotes } from "@/experience/utils/noteParsing";

/* PHASE G · 5. SCENT CHARACTER
   A quiet editorial summary built only from real materials — no invented
   metrics, no fake sliders. Fallback line (no notes) uses the shared
   getCustomerFamily() helper, never raw product.family/category (Task 6).
   Phase 4: materials come from the cleaned flat note list, never raw
   product.allNotes (which can carry unsplit heading fragments like "base
   notes are Mexican chocolate" — see noteParsing.js). */

export default function ScentCharacter({ product }) {
  const reduced = useReducedMotion();
  const materials = parseFragranceNotes(product).all;

  // Without parsed notes, the Character fallback already speaks to identity.
  if (!materials.length) return null;

  return (
    <section className="ahx-d-character-section" aria-label="Scent character">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12% 0px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="ahx-d-section-eyebrow">
          <span className="ahx-d-section-num">04</span>CHARACTER
        </span>
        {materials.length ? (
          <p className="ahx-d-character-line">
            {materials.map((m, i) => (
              <span key={m} className="ahx-d-character-material">
                {m}
                {i < materials.length - 1 ? <span className="ahx-d-character-sep" aria-hidden="true"> · </span> : null}
              </span>
            ))}
          </p>
        ) : (
          <p className="ahx-d-character-line">
            {getCustomerFamily(product)}
          </p>
        )}
        <p className="ahx-d-character-sub">
          {product.hasNotes
            ? "Read top to base as the fragrance lives on skin."
            : "Full note structure arrives with the complete catalogue."}
        </p>
      </motion.div>
    </section>
  );
}
