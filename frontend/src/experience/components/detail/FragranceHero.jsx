import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { bottleFor, formatPrice } from "../../utils/catalogueBridge";
import { getCustomerFamily, getCustomerDisplayName } from "@/bookExperience/data/productDisplay";
import { parseFragranceNotes } from "@/experience/utils/noteParsing";

/* PHASE G · 1. PRODUCT HERO
   The bottle owns the first screen. Soft entry, gentle scroll parallax.
   Never spins; stays photographic. Essential info only. */

export default function FragranceHero({ product, containerRef }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "14%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.06]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, reduced ? 1 : 0.55]);
  const glow = useTransform(scrollYProgress, [0, 1], [0.5, reduced ? 0.5 : 0.18]);

  // Phase 4: prefer real parsed top notes; fall back to the cleaned flat
  // list when the source has no trustworthy top/heart/base signal — never
  // raw product.top (can carry unsplit heading fragments).
  const parsedNotes = parseFragranceNotes(product);
  const previewNotes = parsedNotes.top.length ? parsedNotes.top : parsedNotes.all;
  const preview = previewNotes.length ? `Opens with ${previewNotes.slice(0, 3).join(" · ")}` : null;
  const price = formatPrice(product);

  return (
    <header className="ahx-d-hero" ref={ref}>
      <div className="ahx-d-hero-aura" aria-hidden="true" style={{ opacity: glow }} />

      <motion.div
        className="ahx-d-hero-topline"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="ahx-d-section-num">01</span>
        <span className="ahx-d-eyebrow">
          {getCustomerFamily(product) || "Al Haramain"}
        </span>
      </motion.div>

      <motion.div
        className="ahx-d-hero-inner"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="ahx-d-name">{getCustomerDisplayName(product)}</h1>
        {preview && <p className="ahx-d-preview">{preview}</p>}
      </motion.div>

      <motion.div
        className="ahx-d-bottle-stage"
        style={{ y: reduced ? 0 : y, scale: reduced ? 1 : scale, opacity: reduced ? 1 : opacity }}
      >
        <div className="ahx-d-bottle-reflect" aria-hidden="true" />
        <img
          className="ahx-d-bottle-img"
          src={bottleFor(product, "large")}
          alt={`${product.name} bottle`}
          loading="eager"
          decoding="async"
        />
      </motion.div>

      {price && (
        <motion.p
          className="ahx-d-hero-price"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {price}
        </motion.p>
      )}

      <span className="ahx-d-scrollhint" aria-hidden="true">
        Scroll to unfold
      </span>
    </header>
  );
}
