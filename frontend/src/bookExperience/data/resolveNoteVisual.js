/* Phase 6 — thin compatibility wrapper. The canonical ingredient-image
   resolver now lives in experience/utils/noteVisuals.js (single source
   merging this file + experience/utils/ingredientAssets.js so Book/Detail/
   Finder/ScentOrbit can never disagree on which photo is which
   ingredient). Kept as a separate module, unchanged export name/signature,
   so existing callers (FinderChapter.jsx) are not touched. */
import { resolveNoteVisual } from "@/experience/utils/noteVisuals";

export { resolveNoteVisual };
export default resolveNoteVisual;
