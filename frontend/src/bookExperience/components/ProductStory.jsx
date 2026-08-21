import React from "react";
import FragranceStory from "@/experience/components/detail/FragranceStory";
import ScentCharacter from "@/experience/components/detail/ScentCharacter";
import NoteJourney from "@/experience/components/detail/NoteJourney";

/* Reuses the proven STORY / CHARACTER / NOTES sections wholesale from the
   old experience/ detail module (same real-data business logic — note
   alternating alignment, character fallback, missing-notes handling) —
   this is a restyle pass (wrapped in the new .book-experience shell/CSS
   tokens), not a rebuild of already-correct logic, per the brief. */
export default function ProductStory({ product, containerRef }) {
  return (
    <>
      <FragranceStory product={product} />
      <ScentCharacter product={product} />
      <NoteJourney product={product} containerRef={containerRef} />
    </>
  );
}
