import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { bottleFor, formatPrice } from "../../utils/catalogueBridge";
import ScentTrayGesture from "../ScentTrayGesture";

/* PHASE L.2 · 07 EXPERIENCE
   Not a cart. A request to try the fragrance in store — the Scent Tray's
   primary entry point. Local/session only, no backend write. */

export default function ExperienceCTA({ product }) {
  const reduced = useReducedMotion();

  const trayItem = useMemo(
    () => ({
      id: product.id,
      slug: product.id,
      name: product.name,
      image: bottleFor(product, "medium"),
      type: product.category || product.family || "",
      priceDisplay: formatPrice(product),
      size: null,
    }),
    [product]
  );

  return (
    <section className="ahx-d-cta" aria-label="Experience in store">
      <motion.div
        className="ahx-d-cta-inner"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12% 0px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="ahx-d-section-eyebrow">
          <span className="ahx-d-section-num">07</span>EXPERIENCE
        </span>
        <h2 className="ahx-d-cta-title">READY TO EXPERIENCE IT?</h2>
        <p className="ahx-d-cta-sub">Add it to your Scent Tray and show it to a consultant in store.</p>
        {/* Phase L.2B Part 7 regression fix: keyed on the product id so this
            always gets a fresh mount (and a fresh `isInTray` read) when the
            Detail page switches products. Without this, reopening Detail
            for a different product shortly after adding an earlier one could
            show a stale "IN YOUR SCENT TRAY" state carried over from the
            previous product — confirmed live and reproducible (1 Million
            Lucky Attar added, then opening 1 Million Lucky Perfume
            immediately after showed it as already-added, and its REMOVE
            button deleted the Attar entry instead). */}
        <ScentTrayGesture key={trayItem.id} item={trayItem} />
      </motion.div>
    </section>
  );
}
