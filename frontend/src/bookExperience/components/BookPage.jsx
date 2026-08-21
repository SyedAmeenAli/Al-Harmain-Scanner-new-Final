import React from "react";
import { formatPrice } from "@/experience/utils/catalogueBridge";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";
import { parseFragranceNotes } from "@/experience/utils/noteParsing";

/* Renders one book page's real-data content. 4 deterministic layout
   variants selected by product id (not random) — a small typographic
   rhythm change (alignment / eyebrow placement), never a data change.
   Any missing field (notes, sizes, price) is omitted cleanly — never
   fabricated. */
function layoutVariant(id) {
  return Math.abs(Number(id) || 0) % 4;
}

export default function BookPage({ product, index, total, onOpen }) {
  if (!product) return null;
  const variant = layoutVariant(product.id);
  const price = formatPrice(product);
  const notes = parseFragranceNotes(product).all.slice(0, 3);
  const metaLine = getCustomerFamily(product);
  const size = product.sizes?.[0];
  const sizeLabel = size ? size.label || (size.volumeMl ? `${size.volumeMl} ML` : null) : null;

  return (
    <div className={`bk-page-face bk-page-face--v${variant}`}>
      <p className="bk-eyebrow bk-page-eyebrow">
        {String(index + 1).padStart(3, "0")} / {String(total).padStart(3, "0")}
      </p>
      <h2 className="bk-h2 bk-page-name">{getCustomerDisplayName(product)}</h2>
      {metaLine && <p className="bk-page-meta">{metaLine}</p>}
      {price && <p className="bk-page-price">{price}</p>}
      {notes.length > 0 && (
        <div className="bk-page-notes">
          {notes.map((n) => (
            <span key={n} className="bk-page-note-chip">{n}</span>
          ))}
        </div>
      )}
      {sizeLabel && <p className="bk-page-size">{sizeLabel}</p>}
      <button type="button" className="bk-btn bk-btn--text bk-page-open" onClick={() => onOpen(product)}>
        Read this page <span aria-hidden="true">→</span>
      </button>
      <span className="bk-page-index" aria-hidden="true">{String(index + 1).padStart(4, "0")}</span>
    </div>
  );
}
