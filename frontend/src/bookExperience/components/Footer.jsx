import React from "react";

const BRAND_LOGO = `${process.env.PUBLIC_URL}/assets/brand/logo-al-haramain.png`;

/* New: mounted after the note-matched section, still inside the single
   main-page scroll (no route/overlay). Real logo, real in-page links
   reusing the same scrollIntoView navigation already wired in
   BookExperience, and a "back to top" that scrolls to Hero — never
   replays the intro. No admin mention, no invented contact info. */
export default function Footer({ onNavigate, onOpenTray }) {
  const backToTop = () => {
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="bk-footer">
      <img src={BRAND_LOGO} alt="Al Haramain Perfumes" className="bk-footer-logo" width={56} height={56} />
      <p className="bk-footer-brand">AL HARAMAIN PERFUMES</p>
      <p className="bk-footer-tagline">THE BOOK OF FRAGRANCES</p>

      <nav className="bk-footer-links" aria-label="Footer navigation">
        <button type="button" className="bk-footer-link" onClick={() => onNavigate?.("book")}>The Book</button>
        <button type="button" className="bk-footer-link" onClick={() => onNavigate?.("featured")}>Featured</button>
        <button type="button" className="bk-footer-link" onClick={() => onNavigate?.("notes")}>Scent Notes</button>
        <button type="button" className="bk-footer-link" onClick={() => onOpenTray?.()}>Scent Tray</button>
      </nav>

      <button type="button" className="bk-footer-top" onClick={backToTop}>BACK TO TOP ↑</button>

      <p className="bk-footer-copyright">© 2026 Al Haramain Perfumes</p>
    </footer>
  );
}
