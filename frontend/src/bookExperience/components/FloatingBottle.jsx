import React from "react";
import { motion, useTransform, useMotionValue } from "framer-motion";

/* The bottle rises from the book as an independent animated layer —
   opacity/scale/y/blur — with an elliptical ground shadow that grows as it
   rises, and a restrained gold glow (no particle explosion).
   `rise` may be a framer-motion MotionValue (0..1, continuously driven by
   drag) or a plain number (used when prefers-reduced-motion disables the
   live-drag coupling). */
export default function FloatingBottle({ image, rise = 1, reduced, onClick, label }) {
  const fallback = useMotionValue(typeof rise === "number" ? rise : 1);
  const mv = typeof rise === "number" ? fallback : rise;

  const opacity = useTransform(mv, (r) => (reduced ? 1 : r));
  const y = useTransform(mv, (r) => (reduced ? 0 : (1 - r) * 40));
  const scale = useTransform(mv, (r) => (reduced ? 1 : 0.85 + r * 0.15));
  const blur = useTransform(mv, (r) => (reduced ? 0 : (1 - r) * 6));
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  const shadowScaleX = useTransform(mv, (r) => (reduced ? 1 : 0.6 + r * 0.6));
  const shadowOpacity = useTransform(mv, (r) => (reduced ? 0.35 : 0.15 + r * 0.25));

  return (
    <>
      <motion.div className="bk-floating-shadow" style={{ scaleX: shadowScaleX, opacity: shadowOpacity }} />
      <motion.div
        className="bk-floating-bottle"
        style={{ x: "-50%", opacity, y, scale, filter, pointerEvents: onClick ? "auto" : "none" }}
      >
        {/* Item 6: the bottle itself is a real click target that opens the
            same product's Detail — Discover stays as a secondary/redundant
            path below. Only rendered as a <button> when a handler is
            supplied (FragranceBook omits it while isPageTurning, the same
            guard Discover already follows), so it is never a dead click
            target mid-gesture. */}
        {image && onClick ? (
          <button type="button" className="bk-floating-bottle-btn" onClick={onClick} aria-label={label || "Open product details"}>
            <img src={image} alt="" loading="eager" decoding="sync" />
          </button>
        ) : (
          image && <img src={image} alt="" loading="eager" decoding="sync" />
        )}
      </motion.div>
    </>
  );
}
