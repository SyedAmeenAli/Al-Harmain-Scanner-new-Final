import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getCustomerFamily } from "@/bookExperience/data/productDisplay";

/* PHASE G · 2–3. FRAGRANCE IDENTITY + STORY
   Editorial, not a database table. Uses only real fields.
   identityLine uses the shared getCustomerFamily() classification helper —
   never raw product.categories/type strings (Task 6 taxonomy-leak fix). */

export default function FragranceStory({ product }) {
  const reduced = useReducedMotion();

  const firstPhrase = product.description ? product.description.split(/(?<=[.!?])\s/)[0] : "";
  const rest = product.description
    ? product.description.slice(firstPhrase.length).trim()
    : "";

  const identityLine = getCustomerFamily(product);

  return (
    <section className="ahx-d-story" aria-label="About this fragrance">
      <motion.div
        className="ahx-d-story-inner"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12% 0px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="ahx-d-section-eyebrow">
          <span className="ahx-d-section-num">02</span>THE STORY
        </span>
        {identityLine && <p className="ahx-d-story-kicker">{identityLine}</p>}

        {product.description ? (
          <>
            <p className="ahx-d-story-lead">{firstPhrase}</p>
            {rest && <p className="ahx-d-story-body">{rest}</p>}
          </>
        ) : (
          <p className="ahx-d-story-body ahx-d-story-body--quiet">
            A {identityLine || "fragrance"} from the Al Haramain house — discovered in the
            catalogue, ready to be experienced in store.
          </p>
        )}
      </motion.div>
    </section>
  );
}
