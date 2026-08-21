import React from "react";
import OldRelatedFragrances from "@/experience/components/detail/RelatedFragrances";
import { resolveBookVisual } from "../data/resolveBookVisual";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";

/* Reuses the real getRelated() similarity logic (shared family/category/
   overlapping notes — no fabricated match score) wholesale. Image source
   is overridden to resolveBookVisual (editorial context) so this section
   never renders a legacy `/assets/products/<id>/` bottle. Name/meta are
   overridden to the shared Task 6 helpers so Related never leaks a raw
   taxonomy string (e.g. "Arabic Attar · Best Selling") — the old customer
   experience's own default RelatedFragrances usage is untouched. */
export default function RelatedFragrances({ product, onOpen }) {
  return (
    <OldRelatedFragrances
      product={product}
      onOpen={onOpen}
      resolveImage={(p) => resolveBookVisual(p, { context: "editorial" }).primary}
      resolveName={getCustomerDisplayName}
      resolveMeta={getCustomerFamily}
    />
  );
}
