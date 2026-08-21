import React from "react";

/* Physical book-tab bookmarks — small fixed visible set only
   (ALL / PERFUME / ATTAR / BAKHOOR / MORE), styled as tabs cut into the
   edge of the book (active = deep green + gold micro-detail + slightly
   extended tab; inactive = ivory/muted-green + thin edge). "MORE" does NOT
   reveal an inline list — it opens CatalogueIndex.jsx as a genuine
   table-of-contents chapter (Part 8), which is where every other real
   category lives. Filtering itself is done by the caller (FragranceBook)
   using the same type/category groundwork as InfiniteShelf.jsx. */
const PRIMARY = ["All", "Perfume", "Attar", "Bakhoor"];

export default function BookBookmarks({ active, onSelect, onMore, moreOpen }) {
  const isMoreActive = moreOpen || !PRIMARY.includes(active);
  return (
    <nav className="bk-bookmarks" aria-label="Filter by chapter">
      {PRIMARY.map((label) => (
        <button
          key={label}
          type="button"
          className={`bk-bookmark-tab${active === label ? " is-active" : ""}`}
          onClick={() => onSelect(label)}
        >
          <span className="bk-bookmark-tab-inner">{label.toUpperCase()}</span>
        </button>
      ))}
      <button
        type="button"
        className={`bk-bookmark-tab bk-bookmark-tab--more${isMoreActive ? " is-active" : ""}`}
        onClick={onMore}
        aria-expanded={!!moreOpen}
      >
        <span className="bk-bookmark-tab-inner">MORE</span>
      </button>
    </nav>
  );
}
