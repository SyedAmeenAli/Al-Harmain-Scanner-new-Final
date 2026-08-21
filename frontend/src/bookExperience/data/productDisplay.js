/* productDisplay — shared customer-facing name/family helpers (Task 6).

   Fixes two confirmed bugs:
   1. Raw taxonomy strings ("Arabic Attar", "Clone Attar", "Premium
      Attars", "Best Selling", …) being dumped directly as customer-facing
      copy anywhere `[product.type, product.category].join(" · ")` (or
      similar) was rendered.
   2. "Best Selling · Best Selling" — `product.type` can itself literally be
      the merchandising label "Best Selling" (a real `type` value in the
      catalogue) for the same rows also tagged with the real "Best Selling"
      category, so joining type+category duplicated it. Traced to the
      source: both fields resolving to the same merchandising string, never
      deduped. getCustomerFamily always returns exactly ONE clean label
      derived from the same classification used for image resolution
      (Task 5), never from raw `type`/`categories` strings — merchandising
      labels like "Best Selling" are never a family and are excluded. */

import {
  isBakhoorHolder,
  isBakhoor,
  isFreshener,
  isGiftSet,
  isAttar,
  isPerfume,
} from "./resolveBookVisual.js";

const SUFFIX_RE = /\s*\((Attar|Perfume|Bakhoor|Freshener)\)\s*$/i;

/* Strips ONLY an exact trailing classification suffix like "(Attar)" —
   never touches the real DB name otherwise, never strips unrelated
   parentheses (e.g. "(50ml)" is left alone since it isn't one of the four
   literal classification words). */
export function getCustomerDisplayName(product) {
  const name = (product && product.name) || "";
  return name.replace(SUFFIX_RE, "").trim() || name;
}

/* Exactly one clean top-level label, derived from the SAME classification
   pipeline as the image resolver (Task 5) — never from raw
   categories/type strings, so merchandising tags like "Best Selling" or
   duplicate/legacy category names can never leak into it. */
export function getCustomerFamily(product) {
  const p = product || {};
  if (isBakhoorHolder(p)) return "Bakhoor Holder";
  if (isBakhoor(p)) return "Bakhoor";
  if (isFreshener(p)) return "Freshener";
  if (isGiftSet(p)) return "Gift Set";
  if (isAttar(p)) return "Attar";
  if (isPerfume(p)) return "Perfume";
  return "Perfume";
}

export default { getCustomerDisplayName, getCustomerFamily };
