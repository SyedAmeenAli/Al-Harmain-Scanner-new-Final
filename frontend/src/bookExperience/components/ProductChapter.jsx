import React, { useEffect, useMemo, useRef, useState } from "react";
import "@/experience/experience.css"; // reused STORY/CHARACTER/NOTES/FORMATS/RELATED sections need their proven styling
import { formatPrice } from "@/experience/utils/catalogueBridge";
import { resolveBookVisual } from "../data/resolveBookVisual";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";
import ProductStory from "./ProductStory";
import ProductFormats from "./ProductFormats";
import RelatedFragrances from "./RelatedFragrances";
import useScentTray from "../hooks/useScentTray";

/* Tap-opened as a full-screen chapter transition (not a modal). Bottle is
   free-standing (no card frame). Real data sections only — any missing
   field is omitted cleanly. */
export default function ProductChapter({ product, onClose, onOpenRelated, embedded = false }) {
  const containerRef = useRef(null);
  const { items, has, add, remove } = useScentTray();
  const [justAdded, setJustAdded] = useState(false);
  // Phase 2 — premium confirmation toast state: { kind: 'added'|'already'|'removed', name }.
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = (kind, name) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ kind, name });
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
  // Phase 1 fix: Detail must resolve the SAME visual identity as Book for
  // the same settled product — see resolveBookVisual.js `detail` context
  // for the full root-cause writeup (previously fell through to the
  // default "editorial" pool, which disagreed with Book's "floating" pool).
  const visual = useMemo(() => resolveBookVisual(product || {}, { context: "detail" }), [product]);

  // Detail is a dedicated `.bk-chapter` overlay with its OWN internal
  // scroll surface (see .bk-chapter { overflow-y: auto } in
  // BookExperience.css) — the underlying document scroll is never touched,
  // so the main page position is naturally preserved on close without
  // manual capture/restore. What must be reset explicitly is Detail's own
  // scroll: since a Related-product tap reuses this same mounted instance
  // (only `product` changes, the component never unmounts), every new
  // product — including the very first open — must start at Detail's own
  // top rather than inheriting whatever scroll position the previous
  // product left behind.
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [product?.id]);

  if (!product) return null;

  const price = formatPrice(product);
  const metaLine = getCustomerFamily(product);
  const inTray = has(product.id);
  const size = product.sizes?.[0];

  const toggleTray = () => {
    const displayName = getCustomerDisplayName(product);
    if (inTray) {
      remove(product.id);
      showToast("removed", displayName);
    } else {
      if (has(product.id)) {
        // Defensive — toggleTray only reaches here when !inTray, but keeps
        // the "already present" branch honest if state races.
        showToast("already", displayName);
        return;
      }
      add({
        id: product.id,
        name: displayName,
        image: visual.primary,
        type: metaLine,
        priceDisplay: price,
        size: size ? size.label || (size.volumeMl ? `${size.volumeMl} ML` : null) : null,
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 900);
      showToast("added", displayName);
    }
  };

  return (
    <div className={`bk-chapter${embedded ? " bk-chapter--embedded" : ""}`} ref={containerRef}>
      {/* Phase 2 — premium mobile confirmation toast. Contained to the
          mobile app stage via the same max-width/margin:auto centering
          `.bk-fullnav` uses; z-index sits above ordinary Detail content
          but below the full-screen nav overlay (200). */}
      {toast && (
        <div className="bk-toast" role="status" aria-live="polite">
          <span className="bk-toast-line1">
            {toast.kind === "added" && "✓ Added to Scent Tray"}
            {toast.kind === "already" && "Already in your Scent Tray"}
            {toast.kind === "removed" && "Removed from Scent Tray"}
          </span>
          <span className="bk-toast-line2">{toast.name}</span>
          {toast.kind === "added" && items.length > 0 && (
            <span className="bk-toast-line3">{items.length} fragrance{items.length === 1 ? "" : "s"} saved</span>
          )}
        </div>
      )}
      <div className="bk-page" style={{ paddingBottom: "2rem" }}>
        {/* Item 1/12: when embedded, the Back affordance lives in the
            shared .bk-back-row rendered by BookExperience just above the
            global header's persistent presence — not duplicated here. The
            standalone (non-embedded) button is kept as a fallback for any
            other caller of this component. */}
        {!embedded && (
          <button type="button" className="bk-btn bk-btn--text" onClick={onClose} style={{ alignSelf: "flex-start" }}>
            ← Back to the book
          </button>
        )}

        <div className="bk-product-hero">
          <p className="bk-eyebrow" style={{ textAlign: "center", marginTop: "1rem" }}>{metaLine || "Al Haramain"}</p>
          <h1 className="bk-h1 bk-product-name">{getCustomerDisplayName(product)}</h1>
          <div className={`bk-product-bottle${justAdded ? " bk-bottle-travel" : ""}`}>
            {visual.primary && <img src={visual.primary} alt={`${product.name} bottle`} loading="eager" />}
          </div>
          {price && <p className="bk-product-price">{price}</p>}
        </div>

        <section className="bk-section">
          <ProductStory product={product} containerRef={containerRef} />
        </section>

        <section className="bk-section">
          <ProductFormats product={product} />
        </section>

        <section className="bk-section" aria-label="Experience in store">
          <p className="bk-eyebrow">EXPERIENCE</p>
          <h2 className="bk-h3" style={{ marginTop: "0.4rem" }}>READY TO EXPERIENCE IT?</h2>
          <p className="bk-body" style={{ marginTop: "0.3rem" }}>
            Add it to your Scent Tray and show it to a consultant in store.
          </p>
          <button
            type="button"
            className={`bk-btn ${inTray ? "bk-btn--secondary" : "bk-btn--primary"}`}
            style={{ marginTop: "0.8rem" }}
            onClick={toggleTray}
          >
            {inTray ? "IN YOUR SCENT TRAY ✓" : "I WANT TO SMELL THIS"}
          </button>
        </section>

        <section className="bk-section">
          <RelatedFragrances product={product} onOpen={onOpenRelated} />
        </section>
      </div>
    </div>
  );
}
