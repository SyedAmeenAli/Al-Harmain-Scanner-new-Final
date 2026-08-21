import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search as SearchIcon, X, SlidersHorizontal, ArrowUp, CornerDownRight } from "lucide-react";
import { search, isDescriptive } from "../search/searchEngine";
import { catalogueRepository } from "../search/catalogueRepository";
import { noteImage, QUICK_NOTES, QUICK_CATEGORIES, SORT } from "../search/searchTypes";
import { bottleFor } from "../utils/catalogueBridge";

const BATCH = 30;

const noteSummary = (p) => {
  const parts = [...(p.topNotes || []), ...(p.middleNotes || []), ...(p.baseNotes || [])];
  if (!parts.length) return p.description ? p.description.slice(0, 54) : "Signature Al Haramain composition";
  return parts.slice(0, 3).join(" · ");
};

function StatusTag({ p }) {
  if (p.status === "archived") return <span className="ahx-fnd-tag is-faint">Archived</span>;
  if (p.status === "popular") return <span className="ahx-fnd-tag is-gold">Most Explored</span>;
  return null;
}

/* `resolveImage(product, size)` defaults to the legacy `bottleFor` so the
   old customer experience keeps its exact original behavior. The Book
   Experience's SearchChapter wrapper passes resolveBookVisual (editorial
   context) instead. */
export default function SearchScene({
  onClose,
  onOpenDetail,
  onOpenConcierge,
  recentSearches = [],
  onPushRecent,
  resolveImage = bottleFor,
  resolveName = (p) => p.name,
  resolveMeta = (p) => [p.categories?.join(" · "), p.family].filter(Boolean).join(" · "),
}) {
  const reduced = useReducedMotion();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("search"); // 'search' | 'browse'
  const [visible, setVisible] = useState(BATCH);
  const [sort, setSort] = useState(SORT.RELEVANCE);
  const [filters, setFilters] = useState({ categories: new Set(), availability: new Set() });
  const [sheetOpen, setSheetOpen] = useState(false);

  const meta = catalogueRepository.meta();
  const facets = useMemo(() => catalogueRepository.facets(), []);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = query.trim();
  const result = useMemo(() => (q ? search(q, { quick: true }) : null), [q]);

  // Full (non-quick) result set for the browse view.
  const fullSet = useMemo(
    () => (q ? search(q, { quick: false }).fragrances.map((f) => f.product) : null),
    [q]
  );

  const browseBase = view === "browse" ? fullSet || catalogueRepository.all() : null;

  const browseItems = useMemo(() => {
    if (!browseBase) return [];
    let list = browseBase;
    if (filters.categories.size) {
      list = list.filter((p) => p.categories.some((c) => filters.categories.has(c.toLowerCase())));
    }
    if (filters.availability.size) {
      list = list.filter((p) =>
        filters.availability.has(p.status === "archived" ? "archived" : "inStock")
      );
    }
    list = [...list];
    if (sort === SORT.AZ) list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => (b.status !== "archived" ? 1 : 0) - (a.status !== "archived" ? 1 : 0) || a.name.localeCompare(b.name));
    return list;
  }, [browseBase, filters, sort]);

  const shownBrowse = browseItems.slice(0, visible);
  const activeFilterCount = filters.categories.size + filters.availability.size;

  const commitRecent = (value) => {
    if (value.trim()) onPushRecent?.(value.trim());
  };

  const runQuery = (value) => {
    setQuery(value);
    setView("search");
    setVisible(BATCH);
    commitRecent(value);
  };

  const openBrowse = () => {
    setView("browse");
    setVisible(BATCH);
  };

  const toggleFilter = (group, value) => {
    setFilters((prev) => {
      const next = new Set(prev[group]);
      const key = group === "availability" ? value : value.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [group]: next };
    });
  };

  const descriptive = result && isDescriptive(q, result.hasDirectNameMatch);

  return (
    <motion.div
      className="ahx-search-root"
      role="dialog"
      aria-modal="true"
      aria-label="Search the catalogue"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="ahx-search-aura" aria-hidden="true" />

      <header className="ahx-search-bar">
        <button
          type="button"
          className="ahx-search-back"
          onClick={onClose}
          aria-label="Close search"
        >
          <ArrowUp aria-hidden="true" />
        </button>
        <span className="ahx-search-title">Find a fragrance</span>
        <span className="ahx-search-count">{meta.count} in the house</span>
      </header>

      <div className="ahx-search-field">
        <SearchIcon aria-hidden="true" className="ahx-search-field-icon" />
        <label htmlFor="ahx-search-input" className="ahx-visually-hidden">
          Search by name, note, or type
        </label>
        <input
          ref={inputRef}
          id="ahx-search-input"
          className="ahx-search-input"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setView("search");
            setVisible(BATCH);
          }}
          placeholder="Name, note, or type — try “oud”, “vanilla”, “French”"
          autoComplete="off"
          spellCheck="false"
        />
        {q && (
          <button
            type="button"
            className="ahx-search-clear"
            onClick={() => {
              setQuery("");
              setView("search");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="ahx-search-scroll">
        {!q && (
          <div className="ahx-search-empty">
            <p className="ahx-search-lead">Find any fragrance in the house — fast.</p>

            {recentSearches.length > 0 && (
              <section className="ahx-fnd-group">
                <div className="ahx-fnd-group-head">
                  <span className="ahx-fnd-eyebrow">Recent</span>
                  <button type="button" className="ahx-fnd-clear" onClick={() => onPushRecent?.(null)}>
                    Clear
                  </button>
                </div>
                <div className="ahx-fnd-chips">
                  {recentSearches.map((r) => (
                    <button key={r} type="button" className="ahx-fnd-chip" onClick={() => runQuery(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="ahx-fnd-group">
              <span className="ahx-fnd-eyebrow">By note</span>
              <div className="ahx-fnd-chips">
                {QUICK_NOTES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="ahx-fnd-chip"
                    onClick={() => runQuery(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>

            <section className="ahx-fnd-group">
              <span className="ahx-fnd-eyebrow">By type</span>
              <div className="ahx-fnd-chips">
                {QUICK_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="ahx-fnd-chip"
                    onClick={() => runQuery(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </section>

            <button type="button" className="ahx-fnd-browse-all" onClick={openBrowse}>
              Browse the full catalogue
            </button>
          </div>
        )}

        {q && view === "search" && (
          <div className="ahx-search-results">
            {result.total === 0 && !descriptive && (
              <div className="ahx-fnd-noresult">
                <p className="ahx-fnd-noresult-title">No fragrance matched that search.</p>
                <div className="ahx-fnd-noresult-actions">
                  <button type="button" className="ahx-fnd-link" onClick={() => runQuery("")}>
                    Try another name
                  </button>
                  <button type="button" className="ahx-fnd-link" onClick={() => runQuery("oud")}>
                    Search by note
                  </button>
                </div>
              </div>
            )}

            {descriptive && (
              <button
                type="button"
                className="ahx-fnd-concierge"
                onClick={() => onOpenConcierge(q)}
              >
                <span>
                  <span className="ahx-fnd-concierge-eyebrow">Not a name?</span>
                  <span className="ahx-fnd-concierge-text">
                    Describe it to Scent Concierge
                  </span>
                </span>
                <CornerDownRight aria-hidden="true" />
              </button>
            )}

            {result.notes.length > 0 && (
              <section className="ahx-fnd-group">
                <span className="ahx-fnd-eyebrow">Notes</span>
                <ul className="ahx-fnd-note-list">
                  {result.notes.map((n) => (
                    <li key={n.key}>
                      <button
                        type="button"
                        className="ahx-fnd-note"
                        onClick={() => runQuery(n.label)}
                      >
                        <img src={noteImage(n.label)} alt="" className="ahx-fnd-note-img" loading="lazy" />
                        <span className="ahx-fnd-note-label">{n.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.categories.length > 0 && (
              <section className="ahx-fnd-group">
                <span className="ahx-fnd-eyebrow">Categories</span>
                <div className="ahx-fnd-chips">
                  {result.categories.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className="ahx-fnd-chip"
                      onClick={() => runQuery(c.label)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {result.fragrances.length > 0 && (
              <section className="ahx-fnd-group">
                <div className="ahx-fnd-group-head">
                  <span className="ahx-fnd-eyebrow">Fragrances</span>
                  {result.total > result.fragrances.length && (
                    <button type="button" className="ahx-fnd-seeall" onClick={openBrowse}>
                      See all {result.total} fragrances
                    </button>
                  )}
                </div>
                <ul className="ahx-fnd-ledger">
                  {result.fragrances.map((f, i) => (
                    <li key={f.product.id}>
                      <motion.button
                        type="button"
                        className="ahx-fnd-row"
                        onClick={() => onOpenDetail(f.product)}
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.25) }}
                      >
                        <span className="ahx-fnd-thumb">
                          <img src={resolveImage(f.product, "thumb")} alt="" loading="lazy" decoding="async" />
                        </span>
                        <span className="ahx-fnd-row-body">
                          <span className="ahx-fnd-row-name">{resolveName(f.product)}</span>
                          <span className="ahx-fnd-row-meta">
                            {resolveMeta(f.product)}
                          </span>
                          <span className="ahx-fnd-row-notes">{noteSummary(f.product)}</span>
                        </span>
                        <StatusTag p={f.product} />
                      </motion.button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {view === "browse" && (
          <div className="ahx-fnd-browse">
            <div className="ahx-fnd-browse-bar">
              <span className="ahx-fnd-browse-count">
                {browseItems.length} {q ? "matches" : "fragrances"}
              </span>
              <div className="ahx-fnd-browse-tools">
                <label className="ahx-visually-hidden" htmlFor="ahx-sort">Sort</label>
                <select
                  id="ahx-sort"
                  className="ahx-fnd-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value={SORT.RELEVANCE}>Relevance</option>
                  <option value={SORT.AZ}>A–Z</option>
                </select>
                <button
                  type="button"
                  className={`ahx-fnd-filter-btn${activeFilterCount ? " is-active" : ""}`}
                  onClick={() => setSheetOpen(true)}
                  aria-label="Filters"
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
                </button>
              </div>
            </div>

            {q && (
              <button type="button" className="ahx-fnd-back-search" onClick={() => setView("search")}>
                ← Back to search
              </button>
            )}

            <ul className="ahx-fnd-ledger">
              {shownBrowse.map((p, i) => (
                <li key={p.id}>
                  <button type="button" className="ahx-fnd-row" onClick={() => onOpenDetail(p)}>
                    <span className="ahx-fnd-thumb">
                      <img src={resolveImage(p, "thumb")} alt="" loading="lazy" decoding="async" />
                    </span>
                    <span className="ahx-fnd-row-body">
                      <span className="ahx-fnd-row-name">{resolveName(p)}</span>
                      <span className="ahx-fnd-row-meta">
                        {resolveMeta(p)}
                      </span>
                      <span className="ahx-fnd-row-notes">{noteSummary(p)}</span>
                    </span>
                    <StatusTag p={p} />
                  </button>
                </li>
              ))}
            </ul>

            {visible < browseItems.length && (
              <button
                type="button"
                className="ahx-fnd-loadmore"
                onClick={() => setVisible((v) => v + BATCH)}
              >
                Load more ({browseItems.length - visible} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      {sheetOpen && (
        <div className="ahx-fnd-sheet-root" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="ahx-fnd-sheet-backdrop" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div className="ahx-fnd-sheet">
            <div className="ahx-fnd-sheet-head">
              <span className="ahx-fnd-eyebrow">Filters</span>
              <button type="button" className="ahx-fnd-sheet-close" onClick={() => setSheetOpen(false)} aria-label="Done">
                Done
              </button>
            </div>

            <section className="ahx-fnd-sheet-group">
              <span className="ahx-fnd-sheet-label">Type / Category</span>
              <div className="ahx-fnd-sheet-opts">
                {[...facets.categoryLabels.values()].map((c) => {
                  const on = filters.categories.has(c.toLowerCase());
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`ahx-fnd-sheet-opt${on ? " is-on" : ""}`}
                      onClick={() => toggleFilter("categories", c)}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="ahx-fnd-sheet-group">
              <span className="ahx-fnd-sheet-label">Availability</span>
              <div className="ahx-fnd-sheet-opts">
                <button
                  type="button"
                  className={`ahx-fnd-sheet-opt${filters.availability.has("inStock") ? " is-on" : ""}`}
                  onClick={() => toggleFilter("availability", "inStock")}
                >
                  In Store
                </button>
                <button
                  type="button"
                  className={`ahx-fnd-sheet-opt${filters.availability.has("archived") ? " is-on" : ""}`}
                  onClick={() => toggleFilter("availability", "archived")}
                >
                  Archived
                </button>
              </div>
            </section>

            {activeFilterCount > 0 && (
              <button
                type="button"
                className="ahx-fnd-sheet-reset"
                onClick={() => setFilters({ categories: new Set(), availability: new Set() })}
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
