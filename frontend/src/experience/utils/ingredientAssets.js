/* Phase 6 — thin compatibility wrapper. The canonical resolver now lives
   in ./noteVisuals.js (merges this file + bookExperience/data/
   resolveNoteVisual.js into one source so every context agrees on which
   image is which ingredient). Kept as a separate module, unchanged export
   name/signature, so existing callers (ScentOrbit.jsx — frozen this pass —
   QuickView.jsx, pages/Product.jsx, lib/ingredients.js) are not touched. */
import { getIngredientImage } from "./noteVisuals";

export { getIngredientImage };
export default getIngredientImage;
