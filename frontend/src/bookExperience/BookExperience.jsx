import React, { useEffect, useRef, useState, useCallback } from "react";
import "./BookExperience.css";
import {
  hydrateCatalogue,
  hydrateCategories,
  isHydrated,
} from "@/experience/utils/catalogueBridge";

import IntroSequence from "./components/IntroSequence";
import BookHeader from "./components/BookHeader";
import HeroChapters from "./components/HeroChapters";
import FragranceBook from "./components/FragranceBook";
import FeaturedFragrances from "./components/FeaturedFragrances";
import ProductChapter from "./components/ProductChapter";
import ScentTray from "./components/ScentTray";
import ConsultantView from "./components/ConsultantView";
import NoteDiscovery from "./components/NoteDiscovery";
import MostLovedChapter from "./components/MostLovedChapter";
import Footer from "./components/Footer";
import useScentTray from "./hooks/useScentTray";

/* THE BOOK OF FRAGRANCES — customer-facing entry point.

   CORE ARCHITECTURE (this pass): ONE CONTINUOUS SCROLLABLE PAGE, not a
   screen-stack of separate routes/overlays. After "OPEN THE BOOK":

     <BookHeader />          sticky, logo + real inline search
     <HeroChapters />        ~92-105svh, 3 swipeable videos
     <FragranceBook />       73-frame drag-driven page turn
     <FeaturedFragrances />  horizontal swipe, one dominant item
     <NoteDiscovery />       existing 360 orbit, UNCHANGED physics
                             (its own live note-matched section is built
                             INSIDE ScentOrbit.jsx already — see report)

   All four sit in normal document flow inside one <main>, mounted exactly
   once, always, while `activeView === 'main'`.

   Product Detail, Scent Tray, Consultant View and Most Loved are dedicated
   EXCLUSIVE views (spec-permitted — none of these are in the "must be one
   page" list). "Exclusive" here is load-bearing: when one of them is
   active, the render tree branches — main page (BookHeader incl. its
   inline Search/Finder panels, Hero, Book, Featured, Notes, Footer) is NOT
   mounted at all. Previously these were `position:fixed` overlays stacked
   *underneath* BookHeader's sticky z-index, which is why Search/Finder
   panels could still be visibly on top of a supposedly-open Detail view —
   fixed here by making the branch a real conditional return, not a z-index
   trick. */
export default function BookExperience() {
  const [introDone, setIntroDone] = useState(false);
  const [bookmark, setBookmark] = useState("All");
  // 'main' | 'product' | 'tray' | 'consultant' | 'loved'
  const [activeView, setActiveView] = useState("main");
  const [activeProduct, setActiveProduct] = useState(null);
  // Finder ("Describe a Scent") is an inline chapter living inside
  // BookHeader, only ever mounted while activeView === 'main'.
  const [finderOpen, setFinderOpen] = useState(false);
  // Phase 3 — main-content mode: 'browse' shows the full normal stack;
  // 'search' is reported up by BookHeader whenever its query is non-empty.
  // Combined with finderOpen below, this decides whether Hero/Book/
  // Featured/Notes/Footer are mounted at all (spec: search/finder must NOT
  // render the browse stack underneath, not just scroll it out of view).
  const [searchActive, setSearchActive] = useState(false);
  const [closeSearchSeed, setCloseSearchSeed] = useState(0);
  const mainMode = searchActive ? "search" : finderOpen ? "finder" : "browse";
  const [finderQuery, setFinderQuery] = useState("");
  const [finderSeed, setFinderSeed] = useState(0);
  const [catalogueReady, setCatalogueReady] = useState(isHydrated());
  const { items } = useScentTray();

  const heroRef = useRef(null);
  const bookRef = useRef(null);
  const featuredRef = useRef(null);
  const notesRef = useRef(null);

  // Saved main-page state, restored on Back from any dedicated view. Ref
  // (not state) because writing it must never itself trigger a render.
  const savedMainState = useRef({ scrollY: 0 });

  useEffect(() => {
    if (!isHydrated()) {
      Promise.all([hydrateCatalogue().catch(() => {}), hydrateCategories().catch(() => {})]).finally(() =>
        setCatalogueReady(true)
      );
    } else {
      setCatalogueReady(true);
    }
  }, []);

  /* Single shared entry point for EVERY "open this product's Detail"
     action in the whole experience (Book Discover, Featured Discover,
     Search result, Finder result, Note-matched perfume, Related product,
     Scent-Tray item). Consolidates what used to be several independent
     onClick implementations so there is exactly one place that decides
     what "opening a product" means. */
  const openProductDetail = useCallback((product /*, source */) => {
    if (!product) return;

    // Blur whatever text input is currently focused (search / finder) so
    // the mobile keyboard doesn't stay pinned open behind Detail.
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    // Close/collapse Search + Finder + hamburger (quick-nav) state. Search
    // and quick-nav are local state inside BookHeader and reset for free
    // the moment BookHeader unmounts (below); Finder is lifted state here.
    setFinderOpen(false);

    // Save main-page scroll position so Back can restore it exactly,
    // rather than relying on browser history (which could land on a wrong
    // route entirely).
    savedMainState.current = { scrollY: window.scrollY };

    setActiveProduct(product);
    setActiveView("product");

    // Detail renders fresh (BookHeader/main unmount), so the browser is
    // already at whatever scroll position it was left at — force it to
    // Detail's own top on the next paint.
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }, []);

  const closeToMain = useCallback(() => {
    setActiveView("main");
    setActiveProduct(null);
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedMainState.current.scrollY || 0, left: 0, behavior: "auto" });
    });
  }, []);

  const openTray = useCallback(() => {
    savedMainState.current = { scrollY: window.scrollY };
    setActiveView("tray");
  }, []);

  const openConsultant = useCallback(() => setActiveView("consultant"), []);

  const openLoved = useCallback(() => {
    savedMainState.current = { scrollY: window.scrollY };
    setActiveView("loved");
  }, []);

  // Task 3 — single central goHome()/scrollToSection() entry point used by
  // BOTH the full-screen menu's items AND single logo-tap. "hero" (Home)
  // additionally always closes the lifted Finder state, since Finder can
  // be open while activeView is already 'main' (Search/menu-local state
  // are closed by BookHeader itself before this ever runs).
  const scrollToSection = (key) => {
    if (key === "loved") { openLoved(); return; }
    // Any section jump (Home/Book/Featured/Notes) implies leaving
    // search/finder mode back to the browse stack — those are the only
    // things that mount heroRef/bookRef/featuredRef/notesRef.
    if (finderOpen) setFinderOpen(false);
    if (searchActive) setCloseSearchSeed((s) => s + 1);
    if (activeView !== "main") {
      // HOME/logo/nav from a dedicated view: return to main first, then
      // scroll once it has re-mounted.
      setActiveView("main");
      setActiveProduct(null);
      requestAnimationFrame(() => {
        const map = { hero: heroRef, book: bookRef, featured: featuredRef, notes: notesRef };
        const ref = map[key];
        if (ref?.current) ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      });
      return;
    }
    // Browse stack (main) isn't mounted this render while search/finder was
    // still active — wait a tick for it to remount before scrolling.
    requestAnimationFrame(() => {
      const map = { hero: heroRef, book: bookRef, featured: featuredRef, notes: notesRef };
      const ref = map[key];
      if (ref?.current) ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Opens the inline Finder chapter (in BookHeader) with a given seed
  // query, and scrolls to the very top so the panel — which lives directly
  // under the sticky header, not itself sticky — is actually visible
  // regardless of where on the page the trigger was.
  const openFinder = useCallback((query = "") => {
    setFinderQuery(query);
    setFinderSeed((s) => s + 1);
    setFinderOpen(true);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);
  const closeFinder = useCallback(() => setFinderOpen(false), []);

  // "OPEN THE BOOK" reveals the one-page experience and lands the viewport
  // at the TOP of Hero — never mid-page, never Book/Featured directly.
  const handleIntroDone = () => {
    setIntroDone(true);
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };

  if (!introDone) {
    return (
      <div className="book-experience">
        <IntroSequence onDone={handleIntroDone} />
      </div>
    );
  }

  // ---- Exclusive dedicated views: main page tree is NOT mounted here ----
  // Item 1/12: Product Detail (and, inside it, Related) must keep the
  // global header persistently visible, with a distinct Back row directly
  // below it — header row -> back row -> page content. BookHeader is
  // rendered here with the exact same handlers the main page uses so
  // search/quick-nav/Finder/logo-tap behave identically from Detail.
  if (activeView === "product" && activeProduct) {
    return (
      <div className="book-experience bk-detail-shell">
        <BookHeader
          trayCount={items.length}
          onOpenTray={openTray}
          onOpenProduct={openProductDetail}
          onNavigate={scrollToSection}
          finderOpen={finderOpen}
          finderActivationQuery={finderQuery}
          finderActivationSeed={finderSeed}
          onOpenFinder={openFinder}
          onCloseFinder={closeFinder}
          onSearchActiveChange={setSearchActive}
          closeSearchSeed={closeSearchSeed}
        />
        <div className="bk-back-row">
          <button type="button" className="bk-btn bk-btn--text" onClick={closeToMain}>
            ← Back to the book
          </button>
        </div>
        <ProductChapter
          product={activeProduct}
          onClose={closeToMain}
          onOpenRelated={openProductDetail}
          embedded
        />
      </div>
    );
  }
  if (activeView === "tray") {
    return (
      <div className="book-experience">
        <ScentTray onClose={closeToMain} onOpenConsultant={openConsultant} />
      </div>
    );
  }
  if (activeView === "consultant") {
    return (
      <div className="book-experience">
        <ConsultantView onDone={() => setActiveView("tray")} />
      </div>
    );
  }
  if (activeView === "loved") {
    return (
      <div className="book-experience">
        <MostLovedChapter onClose={closeToMain} onOpenProduct={openProductDetail} />
      </div>
    );
  }

  // ---- Main one-page experience ----
  return (
    <div className="book-experience">
      <BookHeader
        trayCount={items.length}
        onOpenTray={openTray}
        onOpenProduct={openProductDetail}
        onNavigate={scrollToSection}
        finderOpen={finderOpen}
        finderActivationQuery={finderQuery}
        finderActivationSeed={finderSeed}
        onOpenFinder={openFinder}
        onCloseFinder={closeFinder}
        onSearchActiveChange={setSearchActive}
        closeSearchSeed={closeSearchSeed}
        showDescribeScent={mainMode === "browse"}
      />

      {/* Phase 3 — mode: browse | search | finder. Search/Finder render
          their own complete state directly inside BookHeader (inline
          results / FinderChapter, both already mounted above); while
          either is active the browse stack below must NOT also be
          mounted, so it can never show behind the results (spec section
          21: "no Hero image competing behind results"). */}
      {mainMode === "browse" && (
        <main className="bk-main-scroll">
          <div ref={heroRef} id="hero" className="bk-section-anchor">
            <HeroChapters onEnter={() => scrollToSection("book")} onOpenProduct={openProductDetail} catalogueReady={catalogueReady} />
          </div>

          <div ref={bookRef} id="book" className="bk-section-anchor">
            <FragranceBook
              onOpenProduct={openProductDetail}
              bookmark={bookmark}
              onBookmarkChange={setBookmark}
              catalogueReady={catalogueReady}
            />
          </div>

          <div ref={featuredRef} id="featured" className="bk-section-anchor">
            <FeaturedFragrances onOpenProduct={openProductDetail} catalogueReady={catalogueReady} />
          </div>

          <div ref={notesRef} id="notes" className="bk-section-anchor">
            <NoteDiscovery onExploreNote={(note) => openFinder(note)} onOpenProduct={openProductDetail} />
          </div>

          <Footer
            onNavigate={scrollToSection}
            onOpenTray={openTray}
          />
        </main>
      )}
    </div>
  );
}
