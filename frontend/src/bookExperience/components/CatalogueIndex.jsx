import React from "react";
import { getAllProducts } from "@/experience/utils/catalogueBridge";
import useScentTray from "../hooks/useScentTray";

const DESTINATIONS = [
  { num: "01", label: "The Book", key: "book" },
  { num: "02", label: "Perfumes", key: "perfumes" },
  { num: "03", label: "Attars", key: "attars" },
  { num: "04", label: "Bakhoor", key: "bakhoor" },
  { num: "05", label: "Fresheners", key: "fresheners" },
  { num: "06", label: "Scent Notes", key: "notes" },
  { num: "07", label: "Describe a Scent", key: "finder" },
  { num: "08", label: "Most Loved", key: "loved" },
  { num: "09", label: "Search", key: "search" },
  { num: "10", label: "Scent Tray", key: "tray" },
];

/* Full-screen table-of-contents "chapter" — replaces the old translucent
   hamburger overlay. Each row navigates for real via onNavigate(key), which
   BookExperience.jsx maps onto its own chapter/bookmark state (the same
   working navigation plumbing already proven in the old
   CatalogueExperience.jsx / MobileNav.jsx, ported rather than reinvented). */
export default function CatalogueIndex({ onNavigate, onClose }) {
  const products = getAllProducts();
  const { items } = useScentTray();

  return (
    <div className="bk-chapter" role="dialog" aria-label="Index">
      <div className="bk-page">
        <button type="button" className="bk-btn bk-btn--text" onClick={onClose} style={{ alignSelf: "flex-start" }}>
          ← Close
        </button>
        <p className="bk-eyebrow" style={{ marginTop: "1rem" }}>THE BOOK OF FRAGRANCES</p>
        <h1 className="bk-h1">Index</h1>
        <p className="bk-body">{products.length.toLocaleString()} fragrances</p>

        <nav className="bk-index-list" aria-label="Table of contents">
          {DESTINATIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              className="bk-index-item"
              onClick={() => onNavigate(d.key)}
            >
              <span className="bk-index-num">{d.num}</span>
              <span className="bk-index-label">
                {d.label.toUpperCase()}
                {d.key === "tray" && items.length > 0 ? ` (${items.length})` : ""}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
