import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getAllProducts, formatPrice } from "@/experience/utils/catalogueBridge";
import { resolveBookVisual } from "../data/resolveBookVisual";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";
import { resolveNoteVisual } from "../data/resolveNoteVisual";

/* ---------------------------------------------------------------------
   Describe a Scent — inline "Finder" chapter.

   Task-1 conversion: this used to be a fixed-position full-screen `Finder`
   (see `@/experience/components/Finder.jsx`, still used unmodified by the
   old CatalogueExperience) mounted as a `.bk-chapter` overlay from
   BookExperience's `overlay==='finder'` branch. It is now inline, normal
   document flow, expanding directly under BookHeader.

   The `interpret()` text→concept mapper and the concept→product scoring
   loop below are copied VERBATIM (byte-for-byte, only reformatted for
   this file's scope) from `Finder.jsx`'s `interpret`/`matches` — the
   deterministic interpreter itself is untouched, per the freeze. Only the
   presentation (markup/CSS) changed from a modal sheet to an inline panel,
   and ingredient imagery now goes through `resolveNoteVisual` (falls back
   to no image rather than guessing) and `resolveBookVisual` (never the
   legacy `/assets/products/<id>/` path) instead of the old `bottleFor`. */

function interpret(text) {
  const t = text.toLowerCase();
  const concepts = [];

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

  const exclusions = [];
  if (/(not|without|no|avoid|except)\s+(citrus|lemon|orange|bergamot|fresh|bright)/.test(t)) exclusions.push("Citrus");
  if (/(not|without|no|avoid|except)\s+(sweet|vanilla|gourmand)/.test(t)) exclusions.push("Sweet");
  if (/(not|without|no|avoid|except)\s+(oud|heavy|dark)/.test(t)) exclusions.push("Oud");
  if (/(not|without|no|avoid|except)\s+(floral|rose|jasmine)/.test(t)) exclusions.push("Floral");
  if (/(not|without|no|avoid|except)\s+(spice|spicy|pepper)/.test(t)) exclusions.push("Spicy");

  return { concepts, exclusions, original: text };
}

const FAMILY_NOTES = {
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

function matchProducts(interpreted) {
  if (!interpreted) return [];
  const { concepts, exclusions } = interpreted;
  if (!concepts.length) return [];

  return getAllProducts()
    .filter((p) => {
      const allNotes = [
        ...(p.topNotes || []),
        ...(p.middleNotes || []),
        ...(p.baseNotes || []),
        ...(p.allNotes || []),
      ].map((n) => n.toLowerCase());

      for (const excl of exclusions) {
        if (allNotes.some((n) => n.includes(excl.toLowerCase()))) return false;
      }

      let score = 0;
      for (const c of concepts) {
        if (c.note) {
          if (allNotes.some((n) => n.includes(c.note.toLowerCase()))) score += c.weight;
        } else if (c.family) {
          const famNotes = FAMILY_NOTES[c.family] || [];
          if (allNotes.some((n) => famNotes.some((fn) => n.includes(fn)))) score += c.weight;
        }
      }
      return score > 0;
    })
    .sort((a, b) => {
      const pop = (p) => (p.status === "popular" ? 10 : 0);
      return pop(b) - pop(a);
    })
    .slice(0, 6);
}

/* `open` controls the expand/collapse animation (height:auto via max-height,
   opacity, translateY — 260ms). `activationQuery`/`activationSeed` let an
   external trigger (NoteDiscovery's "Explore this trail") push a query in
   and auto-submit even if the text is unchanged from last time (seed bump
   forces the effect to re-run). The component itself never unmounts while
   BookHeader is mounted, so query/interpreted/results/scroll position
   survive a Detail open+Back untouched. */
export default function FinderChapter({ open, activationQuery = "", activationSeed = 0, onClose, onOpenProduct }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [interpreted, setInterpreted] = useState(null);
  const lastSeed = useRef(0);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (activationSeed && activationSeed !== lastSeed.current) {
      lastSeed.current = activationSeed;
      setQuery(activationQuery);
      if (activationQuery.trim()) setInterpreted(interpret(activationQuery));
    }
  }, [activationSeed, activationQuery]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setInterpreted(interpret(query));
  }, [query]);

  const matches = useMemo(() => matchProducts(interpreted), [interpreted]);
  const [primary, ...secondary] = matches;

  return (
    <div className={`bk-finder-inline${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="bk-finder-inline-body">
        <p className="bk-eyebrow">DESCRIBE A SCENT</p>
        <p className="bk-finder-lede">Use your own words.</p>

        <form className="bk-finder-composer" onSubmit={handleSubmit}>
          <label htmlFor="bk-finder-input" className="bk-visually-hidden">
            Describe the scent you want
          </label>
          <input
            ref={inputRef}
            id="bk-finder-input"
            type="text"
            className="bk-finder-input"
            placeholder="e.g. bitter coffee but slightly sweet"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            tabIndex={open ? 0 : -1}
          />
          <button type="submit" className="bk-btn bk-btn--primary bk-finder-submit" disabled={!query.trim()} tabIndex={open ? 0 : -1}>
            FIND MY FRAGRANCE
          </button>
        </form>

        {interpreted && (
          <div className="bk-finder-interpretation">
            <p className="bk-eyebrow">WE READ THIS AS</p>
            <ul className="bk-finder-concepts">
              {interpreted.concepts.map((c, i) => {
                const label = c.note || c.family;
                const visual = c.note ? resolveNoteVisual(c.note) : { image: null };
                return (
                  <li key={i} className="bk-finder-concept-chip">
                    {visual.image && <img src={visual.image} alt="" loading="lazy" />}
                    <span>{label}</span>
                  </li>
                );
              })}
              {interpreted.concepts.length === 0 && (
                <li className="bk-finder-concept-empty">No recognizable scent words yet — try oud, rose, amber, citrus…</li>
              )}
            </ul>
            {interpreted.exclusions.length > 0 && (
              <p className="bk-finder-exclusions">
                Without {interpreted.exclusions.join(", ")}
              </p>
            )}
          </div>
        )}

        {interpreted && (
          <div className="bk-finder-results">
            <p className="bk-eyebrow">
              MATCHING FRAGRANCES{matches.length ? ` · ${matches.length}` : ""}
            </p>

            {!primary ? (
              <p className="bk-finder-empty">No fragrances match. Try a different description.</p>
            ) : (
              <>
                <FinderPrimaryCard product={primary} onOpenProduct={onOpenProduct} />
                {secondary.length > 0 && (
                  <ul className="bk-finder-secondary-list">
                    {secondary.map((p) => (
                      <FinderSecondaryCard key={p.id} product={p} onOpenProduct={onOpenProduct} />
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <button type="button" className="bk-btn bk-btn--text bk-finder-close" onClick={onClose} tabIndex={open ? 0 : -1}>
          DONE
        </button>
      </div>
    </div>
  );
}

function FinderPrimaryCard({ product, onOpenProduct }) {
  const visual = resolveBookVisual(product, { context: "editorial" });
  const price = formatPrice(product);
  return (
    <article className="bk-finder-primary">
      <span className="bk-finder-primary-img-box">
        {/* Primary result is always immediately visible (first thing shown
            after a search) — lazy-loading it was backwards, a real
            above-the-fold anti-pattern that could show a delayed/incomplete
            card on a slow connection. Eager, matching how the Book's own
            primary bottle image is already loaded. */}
        {visual?.primary && <img src={visual.primary} alt="" loading="eager" decoding="sync" />}
      </span>
      <div className="bk-finder-primary-body">
        <h3 className="bk-h3">{getCustomerDisplayName(product)}</h3>
        <p className="bk-finder-primary-meta">
          {[getCustomerFamily(product), price].filter(Boolean).join(" · ")}
        </p>
        <button type="button" className="bk-btn bk-btn--secondary bk-finder-discover" onClick={() => onOpenProduct(product)}>
          DISCOVER →
        </button>
      </div>
    </article>
  );
}

function FinderSecondaryCard({ product, onOpenProduct }) {
  const visual = resolveBookVisual(product, { context: "thumb" });
  return (
    <li>
      <button type="button" className="bk-finder-secondary-row" onClick={() => onOpenProduct(product)}>
        <span className="bk-finder-secondary-img-box">
          {visual?.primary && <img src={visual.primary} alt="" loading="lazy" />}
        </span>
        <span className="bk-finder-secondary-body">
          <span className="bk-finder-secondary-name">{getCustomerDisplayName(product)}</span>
          <span className="bk-finder-secondary-meta">{getCustomerFamily(product)}</span>
        </span>
        <span className="bk-inline-search-arrow" aria-hidden="true">→</span>
      </button>
    </li>
  );
}
