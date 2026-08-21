import React from "react";
import FragranceFormats from "@/experience/components/detail/FragranceFormats";

/* Reuses the proven size/format-chip logic wholesale (informational only,
   omitted entirely when the catalogue has no size data — never fabricated). */
export default function ProductFormats({ product }) {
  return <FragranceFormats product={product} />;
}
