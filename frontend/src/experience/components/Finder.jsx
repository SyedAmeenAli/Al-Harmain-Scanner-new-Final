import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getAllProducts, bottleFor } from "../utils/catalogueBridge";

/**
 * Phase D — Scent Concierge.
 * Natural language input → visual interpretation → matching perfumes.
 * No sliders, no filter chips. Type what you want; watch it become scent.
 */
/* `resolveImage(product, size)` defaults to the legacy `bottleFor` so the
   old customer experience keeps its exact original behavior. The Book
   Experience's FinderChapter wrapper passes resolveBookVisual (editorial
   context) instead. */
export default function Finder({ onClose, onOpenDetail, initialQuery = "", resolveImage = bottleFor }) {
  const reduced = useReducedMotion();
  const inputRef = useRef(null);
  const [query, setQuery] = useState(initialQuery);
  const [interpreted, setInterpreted] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Auto-interpret when opened from a note (e.g. "Explore this trail")
  useEffect(() => {
    if (initialQuery.trim()) {
      setSearching(true);
      const result = interpret(initialQuery);
      setInterpreted(result);
      setSearching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Simple interpreter — maps natural language to note families
  const interpret = useCallback((text) => {
    const t = text.toLowerCase();
    const concepts = [];

    // Scent families
    if (/(oud|agarwood|agar)/.test(t)) concepts.push({ note: "Oud", family: "woody", weight: 3 });
    if (/(rose|floral)/.test(t)) concepts.push({ note: "Rose", family: "floral", weight: 3 });
    if (/(jasmine|sambac)/.test(t)) concepts.push({ note: "Jasmine", family: "floral", weight: 2 });
    if (/(saffron|zafran)/.test(t)) concepts.push({ note: "Saffron", family: "spicy", weight: 3 });
    if (/(amber|ambra)/.test(t)) concepts.push({ note: "Amber", family: "warm", weight: 2 });
    if (/(musk|musky)/.test(t)) concepts.push({ note: "Musk", family: "warm", weight: 2 });
    if (/(vanilla|sweet|gourmand)/.test(t)) concepts.push({ note: "Vanilla", family: "sweet", weight: 2 });
    if (/(patchouli|patch)/.test(t)) concepts.push({ note: "Patchouli", family: "earthy", weight: 2 });
    if (/(sandalwood|sandal)/.test(t)) concepts.push({ note: "Sandalwood", family: "woody", weight: 2 });
    if (/(cedar|cedarwood)/.test(t)) concepts.push({ note: "Cedar", family: "woody", weight: 1 });
    if (/(citrus|lemon|bergamot|orange|grapefruit|fresh|bright)/.test(t)) concepts.push({ note: "Citrus", family: "fresh", weight: 2 });
    if (/(spice|spicy|pepper|cardamom|clove|cinnamon|nutmeg)/.test(t)) concepts.push({ note: "Spice", family: "spicy", weight: 2 });
    if (/(woody|wood)/.test(t)) concepts.push({ note: "Wood", family: "woody", weight: 2 });
    if (/(smoky|smoke|incense|fire)/.test(t)) concepts.push({ note: "Incense", family: "smoky", weight: 2 });
    if (/(leather|suede)/.test(t)) concepts.push({ note: "Leather", family: "leather", weight: 2 });
    if (/(tobacco|tobacco)/.test(t)) concepts.push({ note: "Tobacco", family: "tobacco", weight: 2 });
    if (/(coffee|cafe)/.test(t)) concepts.push({ note: "Coffee", family: "gourmand", weight: 2 });
    if (/(honey|honeyed)/.test(t)) concepts.push({ note: "Honey", family: "sweet", weight: 1 });
    if (/(green|leaf|herb)/.test(t)) concepts.push({ note: "Green", family: "green", weight: 1 });
    if (/(fruit|fruity|berry|apple|peach|apricot|plum)/.test(t)) concepts.push({ note: "Fruit", family: "fruity", weight: 1 });
    if (/(dark|deep|heavy|intense)/.test(t)) concepts.push({ family: "dark", weight: 1 });
    if (/(light|airy|transparent|clean)/.test(t)) concepts.push({ family: "light", weight: 1 });
    if (/(warm|cozy)/.test(t)) concepts.push({ family: "warm", weight: 1 });
    if (/(cold|cool|icy)/.test(t)) concepts.push({ family: "fresh", weight: 1 });
    if (/(night|evening|date)/.test(t)) concepts.push({ family: "evening", weight: 1 });
    if (/(day|morning|office|work)/.test(t)) concepts.push({ family: "day", weight: 1 });
    if (/(summer|hot)/.test(t)) concepts.push({ family: "summer", weight: 1 });
    if (/(winter|cold)/.test(t)) concepts.push({ family: "winter", weight: 1 });

    // Exclusions
    const exclusions = [];
    if (/(not|without|no|avoid|except)\s+(citrus|lemon|orange|bergamot|fresh|bright)/.test(t)) {
      exclusions.push("Citrus");
    }
    if (/(not|without|no|avoid|except)\s+(sweet|vanilla|gourmand)/.test(t)) {
      exclusions.push("Sweet");
    }
    if (/(not|without|no|avoid|except)\s+(oud|heavy|dark)/.test(t)) {
      exclusions.push("Oud");
    }
    if (/(not|without|no|avoid|except)\s+(floral|rose|jasmine)/.test(t)) {
      exclusions.push("Floral");
    }
    if (/(not|without|no|avoid|except)\s+(spice|spicy|pepper)/.test(t)) {
      exclusions.push("Spicy");
    }

    return { concepts, exclusions, original: text };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const result = interpret(query);
    setInterpreted(result);
    setSearching(false);
  };

  // Match perfumes based on interpreted concepts
  const matches = useMemo(() => {
    if (!interpreted) return [];
    const { concepts, exclusions } = interpreted;
    if (!concepts.length) return [];

    return getAllProducts().filter((p) => {
      // Check exclusions first
      const allNotes = [
        ...(p.topNotes || []),
        ...(p.middleNotes || []),
        ...(p.baseNotes || []),
        ...(p.allNotes || []),
      ].map((n) => n.toLowerCase());

      for (const excl of exclusions) {
        if (allNotes.some((n) => n.includes(excl.toLowerCase()))) return false;
      }

      // Score based on concept matches
      let score = 0;
      for (const c of concepts) {
        if (c.note) {
          if (allNotes.some((n) => n.includes(c.note.toLowerCase()))) score += c.weight;
        } else if (c.family) {
          // Family matching via note categories
          const familyNotes = {
            woody: ["oud", "sandalwood", "cedar", "patchouli", "vetiver", "birch", "oakmoss"],
            floral: ["rose", "jasmine", "violet", "iris", "tuberose", "ylang", "orange blossom"],
            spicy: ["saffron", "pepper", "cardamom", "clove", "cinnamon", "nutmeg"],
            fresh: ["citrus", "bergamot", "lemon", "orange", "grapefruit", "green", "mint"],
            warm: ["amber", "vanilla", "tonka", "benzoin", "musk"],
            sweet: ["vanilla", "tonka", "honey", "caramel", "chocolate"],
            earthy: ["patchouli", "vetiver", "oakmoss", "oak"],
            smoky: ["incense", "smoke", "birch", "guaiac"],
            leather: ["leather", "suede", "saffron"],
            gourmand: ["vanilla", "tonka", "chocolate", "coffee", "honey", "caramel"],
            fruity: ["apple", "peach", "apricot", "plum", "berry", "blackcurrant"],
            green: ["green", "galbanum", "violet leaf", "mint"],
          };
          const famNotes = familyNotes[c.family] || [];
          if (allNotes.some((n) => famNotes.some((fn) => n.includes(fn)))) score += c.weight;
        }
      }
      return score > 0;
    }).sort((a, b) => {
      // Prioritize popular, then by concept match strength
      const pop = (p) => p.status === "popular" ? 10 : 0;
      return pop(b) - pop(a);
    }).slice(0, 6);
  }, [interpreted]);

  return (
    <motion.div
      className="ahx-finder-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="ahx-finder-backdrop" onClick={onClose} aria-hidden="true" />

      <motion.section
        className="ahx-finder"
        role="dialog"
        aria-modal="true"
        aria-label="Scent Concierge"
        initial={reduced ? { opacity: 0 } : { y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { y: "6%" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="ahx-finder-bar">
          <button type="button" className="ahx-finder-back" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span className="ahx-finder-title">Scent Concierge</span>
          <div style={{ width: 44 }} />
        </header>

        <div className="ahx-finder-scroll">
          {/* Natural language composer */}
          <form className="ahx-finder-section ahx-composer" onSubmit={handleSubmit}>
            <label className="ahx-composer-label" htmlFor="concierge-input">
              Describe the smell you want…
            </label>
            <div className="ahx-composer-input-wrap">
              <input
                ref={inputRef}
                id="concierge-input"
                type="text"
                className="ahx-composer-input"
                placeholder="e.g. bitter coffee but slightly sweet"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                disabled={searching}
              />
              <button
                type="submit"
                className="ahx-composer-submit"
                disabled={!query.trim() || searching}
                aria-label="Find fragrances"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/></svg>
              </button>
            </div>
            {searching && <span className="ahx-composer-thinking">Interpreting…</span>}
          </form>

          {/* Visual interpretation — the scent trail */}
          {interpreted && (
            <motion.div
              className="ahx-finder-section ahx-interpretation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <span className="ahx-interpretation-label">Your Scent Trail</span>
              <p className="ahx-interpretation-original">"{interpreted.original}"</p>
              <div className="ahx-interpretation-concepts">
                {interpreted.concepts.map((c, i) => (
                  <motion.span
                    key={i}
                    className="ahx-concept-chip"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    {c.note || c.family}
                  </motion.span>
                ))}
                {interpreted.exclusions.length > 0 && (
                  <div className="ahx-exclusions">
                    <span className="ahx-exclusion-label">Without</span>
                    {interpreted.exclusions.map((e, i) => (
                      <span key={i} className="ahx-exclusion-chip">{e}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Results — real perfume bottles */}
          <div className="ahx-finder-section">
            <div className="ahx-finder-results-head">
              <span className="ahx-finder-label">
                {matches.length === 1 ? "1 match" : `${matches.length} matches`}
                {interpreted && ` for your scent trail`}
              </span>
            </div>

            {matches.length === 0 ? (
              <motion.p
                className="ahx-finder-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No fragrances match. Try a different description.
              </motion.p>
            ) : (
              <motion.ul
                className="ahx-finder-grid"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
                }}
              >
                {matches.map((f) => (
                  <motion.li key={f.id} className="ahx-finder-card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                    <button
                      type="button"
                      className="ahx-finder-card-btn"
                      onClick={() => { onClose(); onOpenDetail(f); }}
                      aria-label={`Open ${f.name}`}
                    >
                      <div className={`ahx-finder-card-media${f.status === "archived" ? " is-archive" : ""}`}>
                        <img
                          className="ahx-finder-card-img"
                          src={resolveImage(f, "thumb")}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                        {f.status === "popular" && (
                          <span className="ahx-card-tag is-gold">Most Explored</span>
                        )}
                        {f.status === "archived" && (
                          <span className="ahx-card-tag is-faint">Archived</span>
                        )}
                      </div>
                      <div className="ahx-finder-card-body">
                        <h4 className="ahx-finder-card-name">{f.name}</h4>
                        <p className="ahx-finder-card-meta">
                          {f.category} · {f.family}
                        </p>
                        <p className="ahx-finder-card-notes">
                          {f.topNotes?.slice(0, 3).join(" · ")}
                        </p>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}