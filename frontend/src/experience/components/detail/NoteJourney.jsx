import React, { useMemo, useState } from "react";
import { parseFragranceNotes } from "../../utils/noteParsing";
import { resolveNoteVisual } from "../../utils/noteVisuals";
import { getCustomerFamily } from "@/bookExperience/data/productDisplay";

/* Phase 4/5 rewrite.

   Replaces the previous scroll-scrubbed/sticky-pinned "stage" version
   (300vh scroll-jacking, opacity-crossfaded absolute-positioned panels)
   with a plain static section + REAL segmented tabs, per the spec:
   "Top/Heart/Base must be REAL interaction, not fake" — clicking a tab is
   what changes the visible group now, not scroll position. This also
   removes the reported "03 THE NOTES" overlap (the eyebrow no longer sits
   in the same absolutely-positioned stack as the note grid — it's a
   normal-flow kicker above everything else) and the "feels broken/
   overlaid wrong" complaint (no more simultaneous-opacity stage panels
   fighting for the same screen region mid-scroll).

   Data comes from parseFragranceNotes(product) (see ../../utils/
   noteParsing.js) — never raw product.top/heart/base, which can carry
   unsplit heading fragments ("base notes are Mexican chocolate"). When the
   source has no trustworthy top/heart/base signal at all, `grouped` is
   false and this renders one honest "FRAGRANCE NOTES" flat list instead of
   inventing a layer split. */

const TAB_META = {
  top: { tab: "TOP", full: "Top Notes", hint: "The first impression" },
  heart: { tab: "HEART", full: "Heart Notes", hint: "The character emerges" },
  base: { tab: "BASE", full: "Base Notes", hint: "What lingers on skin" },
};
const TAB_ORDER = ["top", "heart", "base"];

function NoteCell({ name }) {
  const visual = resolveNoteVisual(name);
  return (
    <li className="ahx-nn-cell">
      {visual.image ? (
        <span className="ahx-nn-img" style={{ backgroundImage: `url(${visual.image})` }} aria-hidden="true" />
      ) : (
        // Premium missing-image placeholder — never a broken-image icon,
        // empty bordered ring, or a random unrelated ingredient photo.
        <span className="ahx-nn-placeholder" aria-hidden="true">
          <span className="ahx-nn-placeholder-grain" />
        </span>
      )}
      <span className="ahx-nn-label">{name}</span>
    </li>
  );
}

function NoteGrid({ notes }) {
  if (!notes.length) return null;
  return (
    <ul className="ahx-nn-grid" role="list">
      {notes.map((n) => (
        <NoteCell key={n} name={n} />
      ))}
    </ul>
  );
}

function GroupedNotes({ parsed }) {
  const availableTabs = TAB_ORDER.filter((k) => parsed[k].length > 0);
  const [active, setActive] = useState(availableTabs[0] || "top");
  const activeKey = availableTabs.includes(active) ? active : availableTabs[0];

  return (
    <>
      <div className="ahx-nn-tabs" role="tablist" aria-label="Fragrance note stages">
        {TAB_ORDER.map((key) => {
          const disabled = parsed[key].length === 0;
          const isActive = key === activeKey;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`ahx-nn-tab-${key}`}
              aria-selected={isActive}
              aria-controls={`ahx-nn-panel-${key}`}
              className={`ahx-nn-tab${isActive ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
              disabled={disabled}
              onClick={() => setActive(key)}
            >
              {TAB_META[key].tab}
            </button>
          );
        })}
      </div>

      {TAB_ORDER.map((key) => {
        if (parsed[key].length === 0) return null;
        const isActive = key === activeKey;
        return (
          <div
            key={key}
            id={`ahx-nn-panel-${key}`}
            role="tabpanel"
            aria-labelledby={`ahx-nn-tab-${key}`}
            hidden={!isActive}
            className="ahx-nn-panel"
          >
            <p className="ahx-nn-subtitle">{TAB_META[key].hint}</p>
            <NoteGrid notes={parsed[key]} />
          </div>
        );
      })}
    </>
  );
}

/* Missing-notes fallback: an elegant "character" composition (unchanged
   behavior from the previous version — still real-data-only, no invented
   family/traits). */
function CharacterFallback({ product }) {
  const traits = [getCustomerFamily(product)].filter(Boolean);
  if (traits.length === 0) return null;
  return (
    <section className="ahx-nn-section" aria-label="Fragrance character">
      <p className="ahx-nn-kicker">THE CHARACTER</p>
      <div className="ahx-d-character">
        {traits.map((t) => (
          <span key={t} className="ahx-d-character-word">
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function NoteJourney({ product }) {
  const parsed = useMemo(() => parseFragranceNotes(product), [product]);

  if (!parsed.all.length) return <CharacterFallback product={product} />;

  return (
    <section className="ahx-nn-section" aria-label="Fragrance notes">
      <p className="ahx-nn-kicker">THE NOTES</p>
      {!parsed.grouped && <p className="ahx-nn-title">Fragrance Notes</p>}

      {parsed.grouped ? (
        <GroupedNotes parsed={parsed} />
      ) : (
        <>
          <p className="ahx-nn-subtitle">Everything real on record for this fragrance.</p>
          <NoteGrid notes={parsed.all} />
        </>
      )}
    </section>
  );
}
