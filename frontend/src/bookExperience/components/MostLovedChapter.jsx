import React from "react";
import "@/experience/experience.css";
import MostLoved from "@/experience/components/MostLoved";
import { resolveBookVisual } from "../data/resolveBookVisual";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";

/* Restyle onto the book visual language via the .bk-chapter shell — reuses
   the real isPopular && inStock eligibility and swipe mechanics wholesale
   (no new eligibility logic). Full bespoke book-styled MostLoved presentation
   is triaged down given the size of this pass — see final report. Image
   source is overridden to resolveBookVisual (editorial context) so this
   chapter never renders a legacy `/assets/products/<id>/` bottle. */
export default function MostLovedChapter({ onClose, onOpenProduct }) {
  return (
    <div className="bk-chapter" role="dialog" aria-label="Most Loved">
      <div className="bk-page" style={{ paddingTop: "1rem" }}>
        <button type="button" className="bk-btn bk-btn--text" onClick={onClose} style={{ alignSelf: "flex-start" }}>
          ← Back to the book
        </button>
        <h1 className="bk-h1" style={{ marginTop: "0.75rem" }}>Most Loved</h1>
        <MostLoved
          onOpenDetail={onOpenProduct}
          resolveImage={(p) => resolveBookVisual(p, { context: "editorial" }).primary}
          resolveName={getCustomerDisplayName}
          resolveMeta={getCustomerFamily}
        />
      </div>
    </div>
  );
}
