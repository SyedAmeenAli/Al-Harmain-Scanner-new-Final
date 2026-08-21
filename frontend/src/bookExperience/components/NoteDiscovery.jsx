import React from "react";
import "@/experience/experience.css";
import ScentOrbit from "@/components/ScentOrbit";

/* Restyle wrapper around the existing 360 Scent Ring — reuses the already-
   debugged orbit physics/auto-rotation/pause-resume/IntersectionObserver/
   reduced-motion gating wholesale (do not rewrite working physics). That
   component already carries the "one large featured real bottle + 2
   ALSO DISCOVER alternatives" layout added in a prior phase; its bottle
   image now sources from resolveBookVisual() (editorial context) instead of
   the legacy catalogueBridge.bottleFor() — the ONLY change made to
   ScentOrbit.jsx this pass (see ../../components/ScentOrbit.jsx lines
   changed: the `bottleFor` import + its two `<img src=...>` call sites).
   Orbit physics/drag/rotation/matching-logic untouched. */
export default function NoteDiscovery({ onExploreNote, onOpenProduct }) {
  /* Was wrapped in `.bk-chapter` (position: fixed; inset: 0) — correct for
     the old screen-stack architecture where Notes was a full-screen
     overlay, but wrong now that Notes is a normal section inside the one
     continuous page: a fixed wrapper here would pin the whole orbit to the
     viewport instead of letting it sit in document flow after Featured.
     Swapped for a plain flow container; nothing inside ScentOrbit.jsx
     itself changed. */
  return (
    <section className="bk-notes-section" role="region" aria-label="Scent Notes">
      <div className="bk-notes-inner">
        <ScentOrbit onExploreNote={onExploreNote} onOpenProduct={onOpenProduct} />
      </div>
    </section>
  );
}
