import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ShoppingBag, Search as SearchIcon, X, Sparkles } from "lucide-react";
import { search } from "@/experience/search/searchEngine";
import { formatPrice } from "@/experience/utils/catalogueBridge";
import { resolveBookVisual } from "../data/resolveBookVisual";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";
import FinderChapter from "./FinderChapter";

const BRAND_LOGO = `${process.env.PUBLIC_URL}/assets/brand/logo-al-haramain.png`;

/* Persistent sticky header for the one-page experience: Al Haramain
   wordmark, an ACTUAL visible search input (not an icon that opens a
   modal), and quick-nav/tray icons. Tapping/typing never opens a modal or
   dims the page — results expand INLINE directly below the header (see
   InlineSearchResults), pushing the rest of the page down in normal
   document flow. Reuses the exact same client-side search() the old
   SearchChapter/SearchScene used — untouched.

   "Describe a scent →" is a restrained secondary entry point living right
   under the search bar. It expands the Finder inline chapter below the
   header (own component, see FinderChapter.jsx) in the same normal-flow
   manner as search results/quick-nav. Search, quick-nav and Finder are
   mutually exclusive — activating one collapses whichever of the other two
   was open, never more than one visible at once. `finderOpen`/
   `finderActivationQuery`/`finderActivationSeed` are controlled from
   BookExperience so a distant trigger (NoteDiscovery's "Explore this
   trail") can open this same panel. */
export default function BookHeader({
  trayCount = 0,
  onOpenTray,
  onOpenProduct,
  onNavigate,
  finderOpen = false,
  finderActivationQuery = "",
  finderActivationSeed = 0,
  onOpenFinder,
  onCloseFinder,
  onSearchActiveChange,
  closeSearchSeed = 0,
  showDescribeScent = false,
}) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const lastCloseSearchSeed = useRef(0);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (closeSearchSeed && closeSearchSeed !== lastCloseSearchSeed.current) {
      lastCloseSearchSeed.current = closeSearchSeed;
      setQuery("");
    }
  }, [closeSearchSeed]);
  const navigate = useNavigate();
  const logoTapsRef = useRef([]);

  // Hidden 5-tap-logo -> Admin gesture, mirroring the exact pattern already
  // used pre-Book in experience/components/BrandMark.jsx (5 taps within a
  // 3s rolling window navigates to the admin entry point). Never surfaced
  // in customer-facing UI — no label, no hint, no visible affordance.
  // A single ordinary tap just scrolls the page back to Hero's top, reusing
  // the same section-scroll path as quick-nav's "Top" item.
  // Closes every local overlay/panel this header owns (full-screen menu,
  // search, quick-nav-adjacent state) — Task 3's goHome() central function
  // lives in BookExperience (onNavigate), this is its header-local half.
  const closeLocalPanels = () => {
    setMenuOpen(false);
    setQuery("");
  };

  const handleLogoTap = () => {
    const now = Date.now();
    const recent = logoTapsRef.current.filter((t) => now - t < 3000);
    recent.push(now);
    logoTapsRef.current = recent;
    // Single-tap Home behavior always fires immediately and independently
    // of the accumulator below — taps 1-4 still scroll to Hero-top, tap 5
    // additionally (not instead) triggers the admin route. Close any local
    // panel (full-screen menu/search) first so Home always lands clean.
    closeLocalPanels();
    if (finderOpen) onCloseFinder?.();
    onNavigate?.("hero");
    if (recent.length >= 5) {
      logoTapsRef.current = [];
      // Phase J SQLite/PIN-based admin — the CURRENT/active admin build.
      // NOT /admin/login (that's the legacy Mongo/JWT AdminAuthContext admin).
      navigate("/admin/catalogue");
      return;
    }
  };

  const q = query.trim();
  const result = useMemo(() => (q ? search(q, { quick: true }) : null), [q]);

  // Phase 3 — "SEARCH" is a distinct main-content MODE (spec section 21):
  // while a query is active the browse stack (Hero/Book/Featured/Notes)
  // must stop rendering underneath the results, not just get scrolled out
  // of view. BookExperience owns that suppression; this only reports
  // active/inactive up to it (mirrors finderOpen, which is already lifted
  // state there).
  useEffect(() => {
    onSearchActiveChange?.(!!q);
  }, [q, onSearchActiveChange]);

  const clear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const activateSearch = (value) => {
    setQuery(value);
    setMenuOpen(false);
    if (value.trim() && finderOpen) onCloseFinder?.();
  };

  const openFinderInline = () => {
    setQuery("");
    setMenuOpen(false);
    onOpenFinder?.("");
  };

  // Mutual exclusion when Finder is opened from OUTSIDE this component
  // (NoteDiscovery's "Explore this trail", full-screen menu's own item):
  // collapse whichever local panel (search results / full-screen menu) was
  // open so only one of the three is ever visible.
  useEffect(() => {
    if (finderOpen) {
      setQuery("");
      setMenuOpen(false);
    }
  }, [finderOpen]);

  // Full-screen menu item -> destination. Selecting any item closes the
  // menu completely FIRST, then performs the actual navigation (Task 2).
  const selectNavItem = (action) => {
    setMenuOpen(false);
    requestAnimationFrame(action);
  };

  return (
    <>
      <header className="bk-header">
        <button
          type="button"
          className="bk-header-mark"
          aria-label="Al Haramain Perfumes — scroll to top"
          onClick={handleLogoTap}
        >
          <img src={BRAND_LOGO} alt="" width={40} height={40} />
        </button>

        <div className="bk-header-search">
          <SearchIcon size={15} aria-hidden="true" className="bk-header-search-icon" />
          <label htmlFor="bk-header-search-input" className="bk-visually-hidden">
            Search fragrances by name, note, or type
          </label>
          <input
            ref={inputRef}
            id="bk-header-search-input"
            className="bk-header-search-input"
            type="search"
            value={query}
            onChange={(e) => activateSearch(e.target.value)}
            placeholder="Search fragrances…"
            autoComplete="off"
            spellCheck="false"
          />
          {q && (
            <button type="button" className="bk-header-search-clear" onClick={clear} aria-label="Clear search">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="bk-header-actions">
          <button type="button" className="bk-header-icon-btn" aria-label="Scent tray" onClick={onOpenTray}>
            <ShoppingBag size={17} aria-hidden="true" />
            {trayCount > 0 && <span className="bk-header-badge">{trayCount}</span>}
          </button>
          <button
            type="button"
            className="bk-header-icon-btn"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Restrained secondary entry point, directly under the search bar —
          not a giant button. Home/browse-only (spec items 1-2/16): hidden
          on Search results, Finder results, Product Detail, and every other
          non-browse view. Tapping expands FinderChapter inline right below
          it, collapsing search/quick-nav if open. */}
      {showDescribeScent && (
        <div className="bk-finder-entry-row">
          <button type="button" className="bk-finder-entry" onClick={openFinderInline} aria-expanded={finderOpen}>
            <Sparkles size={13} aria-hidden="true" />
            <span>Describe a scent →</span>
          </button>
        </div>
      )}

      <FinderChapter
        open={finderOpen}
        activationQuery={finderActivationQuery}
        activationSeed={finderActivationSeed}
        onClose={onCloseFinder}
        onOpenProduct={onOpenProduct}
      />

      {/* FULL-SCREEN navigation (Task 2 override) */}
      <AnimatePresence>
        {menuOpen && (
          <div className="bk-fullnav-wrapper">
            <motion.div
              className="bk-fullnav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div 
              className="bk-fullnav" 
              role="dialog" 
              aria-modal="true" 
              aria-label="Navigation"
              initial={{ x: "100%" }}
              animate={{ x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ x: "100%", transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
            >
                <div className="bk-fullnav-topbar">
                  <span className="bk-fullnav-mark">
                    <img src={BRAND_LOGO} alt="" width={34} height={34} />
                    <span className="bk-fullnav-wordmark">Al Haramain</span>
                  </span>
                  <button type="button" className="bk-fullnav-close" onClick={() => setMenuOpen(false)}>
                    <X size={15} aria-hidden="true" /> Close
                  </button>
                </div>
                <motion.nav 
                  className="bk-fullnav-list" 
                  aria-label="Sections"
                  initial="closed"
                  animate="open"
                  exit="closed"
                  variants={{
                    open: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
                    closed: { transition: { staggerChildren: 0.02, staggerDirection: -1 } }
                  }}
                >
                  {[
                    { label: "Home", target: () => onNavigate("hero") },
                    { label: "The Book", target: () => onNavigate("book") },
                    { label: "Featured", target: () => onNavigate("featured") },
                    { label: "Scent Notes", target: () => onNavigate("notes") },
                    { label: "Find My Fragrance", target: openFinderInline },
                    { label: "Scent Tray", target: () => onOpenTray?.() },
                    { label: "Most Loved", target: () => onNavigate("loved") }
                  ].map((item, idx) => (
                    <motion.button 
                      key={idx}
                      type="button" 
                      className="bk-fullnav-item" 
                      onClick={() => selectNavItem(item.target)}
                      variants={{
                        open: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
                        closed: { opacity: 0, y: 8, transition: { duration: 0.2, ease: "easeIn" } }
                      }}
                    >
                      {item.label} <span className="bk-fullnav-item-arrow" aria-hidden="true">→</span>
                    </motion.button>
                  ))}
                </motion.nav>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline search results — pushes content down, never overlays it. */}
      {q && !finderOpen && (
        <div className="bk-inline-search" role="region" aria-label="Search results">
          {(!result || result.fragrances.length === 0) ? (
            <p className="bk-inline-search-empty">No fragrance matched “{q}”.</p>
          ) : (
            <ul className="bk-inline-search-list">
              {result.fragrances.map((f) => {
                const p = f.product;
                const visual = resolveBookVisual(p, { context: "thumb" });
                const price = formatPrice(p);
                return (
                  <li key={p.id}>
                    <button type="button" className="bk-inline-search-row" onClick={() => { setQuery(""); onOpenProduct(p); }}>
                      <span className="bk-inline-search-thumb">
                        {visual?.primary && <img src={visual.primary} alt="" loading="lazy" />}
                      </span>
                      <span className="bk-inline-search-body">
                        <span className="bk-inline-search-name">{getCustomerDisplayName(p)}</span>
                        <span className="bk-inline-search-meta">
                          {getCustomerFamily(p)}
                          {price ? ` · ${price}` : ""}
                        </span>
                      </span>
                      <span className="bk-inline-search-arrow" aria-hidden="true">→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
