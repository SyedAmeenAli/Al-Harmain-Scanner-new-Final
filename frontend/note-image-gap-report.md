# Note Image Gap Report

Read-only scan of `backend/data/alharamain.sqlite` (`notes` + `product_notes`, `deleted_at IS NULL`, 1468 real catalogue products). Note labels are cleaned with the same rules as `frontend/src/experience/utils/noteParsing.js` (strips baked-in heading/connective fragments like "base notes are") before counting, then grouped case-insensitively. No DB writes.

**Total normalized notes found:** 315
**With an existing image asset:** 19
**Without an image asset (placeholder shown):** 296

## Existing asset coverage (8 groups, `frontend/public/assets/notes/`)

| Normalized note | Catalogue product count | Existing image | Asset |
|---|---|---|---|
| Bergamot | 30 | yes | note-citrus.png |
| Rose | 20 | yes | note-rose.png |
| Vanilla | 19 | yes | note-vanilla.png |
| Mandarin Orange | 14 | yes | note-citrus.png |
| Tobacco | 10 | yes | note-tobacco-leaf.png |
| Lemon | 8 | yes | note-citrus.png |
| Saffron | 8 | yes | note-saffron.png |
| Madagascar Vanilla | 8 | yes | note-vanilla.png |
| Grapefruit | 7 | yes | note-citrus.png |
| Orange | 6 | yes | note-citrus.png |
| Cinnamon | 6 | yes | note-dark-spice.png |
| Bourbon Vanilla | 4 | yes | note-vanilla.png |
| Spices | 4 | yes | note-dark-spice.png |
| Bulgarian Rose | 4 | yes | note-rose.png |
| Turkish Rose | 4 | yes | note-rose.png |
| Mandarin | 2 | yes | note-citrus.png |
| Clove | 2 | yes | note-dark-spice.png |
| Agarwood | 2 | yes | note-oud.png |
| Raspberry | 2 | yes | note-berries.png |

## Top 30 missing notes by catalogue frequency (no image asset — placeholder disc shown)

| Normalized note | Catalogue product count | Priority |
|---|---|---|
| Patchouli | 33 | HIGH (priority list) |
| Amber | 30 | HIGH (priority list) |
| Cedar | 29 | normal |
| Leather | 27 | HIGH (priority list) |
| Tonka Bean | 24 | HIGH (priority list) |
| Sandalwood | 24 | HIGH (priority list) |
| Musk | 19 | HIGH (priority list) |
| Vetiver | 18 | HIGH (priority list) |
| Apple | 16 | HIGH (priority list) |
| Amberwood | 16 | normal |
| Lavender | 14 | HIGH (priority list) |
| Ambergris | 14 | normal |
| Jasmine | 13 | HIGH (priority list) |
| Plum | 13 | normal |
| Cardamom | 12 | HIGH (priority list) |
| oak moss | 11 | normal |
| Honey | 11 | HIGH (priority list) |
| Cashmere Wood | 11 | normal |
| Sage | 10 | normal |
| Ginger | 10 | normal |
| Hazelnut | 10 | normal |
| Orange Blossom | 10 | HIGH (priority list) |
| Sea | 10 | normal |
| Agarwood (Oud) | 8 | normal |
| Olibanum | 8 | normal |
| Ylang-Ylang | 8 | normal |
| Woody | 7 | normal |
| Ozonic | 7 | normal |
| Grapefruit and Bergamot | 7 | normal |
| Violet Leaf | 6 | normal |

## Full missing list (296 notes)

| Normalized note | Catalogue product count | Priority |
|---|---|---|
| Patchouli | 33 | HIGH |
| Amber | 30 | HIGH |
| Cedar | 29 |  |
| Leather | 27 | HIGH |
| Tonka Bean | 24 | HIGH |
| Sandalwood | 24 | HIGH |
| Musk | 19 | HIGH |
| Vetiver | 18 | HIGH |
| Apple | 16 | HIGH |
| Amberwood | 16 |  |
| Lavender | 14 | HIGH |
| Ambergris | 14 |  |
| Jasmine | 13 | HIGH |
| Plum | 13 |  |
| Cardamom | 12 | HIGH |
| oak moss | 11 |  |
| Honey | 11 | HIGH |
| Cashmere Wood | 11 |  |
| Sage | 10 |  |
| Ginger | 10 |  |
| Hazelnut | 10 |  |
| Orange Blossom | 10 | HIGH |
| Sea | 10 |  |
| Agarwood (Oud) | 8 |  |
| Olibanum | 8 |  |
| Ylang-Ylang | 8 |  |
| Woody | 7 |  |
| Ozonic | 7 |  |
| Grapefruit and Bergamot | 7 |  |
| Violet Leaf | 6 |  |
| Benzoin | 6 |  |
| White Musk | 6 |  |
| Patchouli and Vetiver | 6 |  |
| Osmanthus | 6 |  |
| Incense | 6 | HIGH |
| Rosemary | 6 |  |
| Neroli | 6 |  |
| Myrrh | 6 | HIGH |
| Guaiac Wood | 6 |  |
| Bitter Almond | 6 |  |
| Oakmoss | 6 | HIGH |
| Peach | 5 | HIGH |
| Vanilla and Moss | 4 |  |
| Licorice | 4 |  |
| Oud and Blue Lilies | 4 |  |
| Leather and Patchouli | 4 |  |
| Tobacco and Amber | 4 |  |
| Pineapple | 4 | HIGH |
| Labdanum | 4 |  |
| Praline | 4 | HIGH |
| Pepper | 4 |  |
| Mango | 4 |  |
| Grapefruit and Pink Pepper | 4 |  |
| Opoponax | 4 |  |
| Nutmeg | 4 | HIGH |
| Orange Blossom and Jasmine | 4 |  |
| Vetiver and Oakmoss | 4 |  |
| Rum | 4 |  |
| Tahitian Vanilla | 4 |  |
| Violet | 4 | HIGH |
| Suede | 4 |  |
| Orchid | 4 |  |
| Mexican chocolate | 4 | HIGH |
| Coriander | 4 |  |
| Barley | 4 |  |
| Clary Sage and Lavender | 4 |  |
| Vanilla and Orris | 4 |  |
| Cashmeran | 4 |  |
| Clary Sage | 4 |  |
| Cashmeran and Vetiver | 4 |  |
| Pine Tree | 4 |  |
| Aldehydes | 4 |  |
| Geranium | 4 | HIGH |
| dried fruits and woody | 4 |  |
| Sichuan Pepper | 4 |  |
| Ambroxan | 4 |  |
| Casablanca Lily | 4 |  |
| Fig Nectar | 4 |  |
| Juniper | 4 |  |
| Jasmine and Laurels | 4 |  |
| Leather and Jasmine Sambac | 4 |  |
| Bay Leaf and Jasmine | 4 |  |
| Bamboo | 4 |  |
| Freesia | 3 |  |
| Black Currant | 3 |  |
| that intermingle with | 3 |  |
| Mint | 3 |  |
| Musk and Amber | 3 |  |
| Fire Accord | 2 |  |
| Smoke | 2 |  |
| Mineral | 2 |  |
| Salt | 2 |  |
| Vetiver V | 2 |  |
| Smoke and Cinnamon | 2 |  |
| Orcanox™ | 2 |  |
| Iso E Super and Clary Sage | 2 |  |
| Orange and Lemon | 2 |  |
| Watermelon and Coconut | 2 |  |
| Amberwood and Cacao | 2 |  |
| Bergamot and Lemon | 2 |  |
| Maple syrup | 2 |  |
| Cinnamon and Lavender | 2 |  |
| Benzoin and Labdanum | 2 |  |
| Cherry and Mandarin Orange | 2 |  |
| Spices and Lavender | 2 |  |
| Chestnut | 2 |  |
| Vanilla and Amberwood | 2 |  |
| Lavender Middle note is Anise Base note is Benzoin | 2 |  |
| Anise Base note is Benzoin | 2 |  |
| Green | 2 |  |
| Japanese Cherry Blossom | 2 |  |
| Jasmine and Hedione | 2 |  |
| Mimosa and Violet | 2 |  |
| Amber and Leather | 2 |  |
| Blackcurrant and Saffron | 2 |  |
| Amber and Sandalwood | 2 |  |
| Cambodian Oud and Saffron | 2 |  |
| Birch and Cinnamon | 2 |  |
| Coconut | 2 |  |
| Vanilla and White Musk | 2 |  |
| Pimento and Mandarin | 2 |  |
| Orange Blossom and Patchouli | 2 |  |
| Tonka Bean and Benzoin | 2 |  |
| Yuzu | 2 |  |
| Juniper and Ginger | 2 |  |
| Cucumber | 2 |  |
| Sea Salt | 2 |  |
| Iris and Sage | 2 |  |
| Ambrofix™ and Akigalawood | 2 |  |
| Lemon & Bergamot | 2 |  |
| Birch | 2 |  |
| Angelica & Patchouli | 2 |  |
| Musk & Iris | 2 |  |
| Grapefruit and Mandarin Orange | 2 |  |
| Geranium and Fennel | 2 |  |
| Orange and Pomelo | 2 |  |
| Caramel | 2 | HIGH |
| Vanilla and Jasmine | 2 |  |
| Sage and Cedar Tango by | 2 |  |
| Pear | 2 | HIGH |
| Bergamot and Mandarin | 2 |  |
| Turkish Rose and African Orange Flower | 2 |  |
| Akigalawood | 2 |  |
| Vanilla Absolute and Sandalwood | 2 |  |
| Fig and Black Tea | 2 |  |
| Iris and Bourbon Vetiver | 2 |  |
| Sandalwood and Tonka Bean | 2 |  |
| Saffron and Raspberry | 2 |  |
| Cypriol and Olibanum | 2 |  |
| Cedarwood and Benzoin | 2 |  |
| Apricot | 2 |  |
| Pomegranate | 2 |  |
| Tangerine | 2 |  |
| Cappuccino | 2 |  |
| Black Tea and Davana | 2 |  |
| Cedarwood | 2 | HIGH |
| Cypriol | 2 |  |
| Patchouli and Labdanum | 2 |  |
| Oregano | 2 |  |
| Pepper and Bergamot | 2 |  |
| Amber and Labdanum | 2 |  |
| Sandalwood and Patchouli | 2 |  |
| Bergamot and Pink Pepper | 2 |  |
| Frankincense | 2 | HIGH |
| Myrrh and Juniper Berries | 2 |  |
| Cedarwood and Patchouli | 2 |  |
| Pink Pepper and Petitgrain | 2 |  |
| Orris Root and Ylang-Ylang | 2 |  |
| Vetiver and Patchouli | 2 |  |
| Anise | 2 |  |
| Elemi resin | 2 |  |
| Basil and Bergamot | 2 |  |
| Fenugreek | 2 |  |
| Prunol | 2 |  |
| Orange Blossom and Rose | 2 |  |
| Birch Tar | 2 |  |
| Peru Balsam | 2 |  |
| Vetiver and Musk | 2 |  |
| Coriander and Mandarin Orange | 2 |  |
| Carnation | 2 |  |
| Sandalwood and Orris Root | 2 |  |
| Civet | 2 |  |
| Tonka Bean and Amber | 2 |  |
| Pineapple and Saffron | 2 |  |
| Balsam Fir and Jasmine | 2 |  |
| Amber and Agarwood (Oud) | 2 |  |
| Cardamom and Bergamot | 2 |  |
| Brandy | 2 |  |
| Cedar and Ambroxan | 2 |  |
| Brown sugar | 2 |  |
| Lily-of-the-Valley | 2 |  |
| Magnolia | 2 |  |
| Lime Blossom | 2 |  |
| Thyme and Lilac | 2 |  |
| Tuberose | 2 | HIGH |
| Nutmeg and Carnation | 2 |  |
| Woodsy | 2 |  |
| Iris | 2 |  |
| Musk and Clove | 2 |  |
| Italian Lemon | 2 |  |
| Sicilian Bergamot and Star Anise | 2 |  |
| Orange Blossom and Cardamon | 2 |  |
| Driftwood and Moss | 2 |  |
| Truffle | 2 | HIGH |
| Gardenia | 2 |  |
| Mandarin Orange and Amalfi Lemon | 2 |  |
| Fruity | 2 |  |
| Jasmine and Lotus | 2 |  |
| Vanille | 2 |  |
| Vetiver and White Musk | 2 |  |
| Orange and Lime | 2 |  |
| Coffee | 2 | HIGH |
| Frangipani | 2 |  |
| Narcissus | 2 |  |
| Artemisia and Rose | 2 |  |
| Mahogany | 2 |  |
| Oakmoss and Violet | 2 |  |
| White Woods and Ambe Inspired By Fucking Fabulous | 2 |  |
| Saffron and Orange | 2 |  |
| Patchouli and Orris Root | 2 |  |
| white honey and Vetiver | 2 |  |
| Basil | 2 |  |
| Geranium and Gentiana | 2 |  |
| Green Apple | 2 |  |
| tobacco leaf and spicy | 2 |  |
| tobacco blossom | 2 |  |
| cacao | 2 | HIGH |
| of seaweed | 2 |  |
| grapefruit with rosemary and cedar base | 2 |  |
| Calabrian bergamot and Pepper | 2 |  |
| Pink Pepper | 2 | HIGH |
| Geranium and elemi | 2 |  |
| Cedar and Labdanum | 2 |  |
| Sicilian Mandarin | 2 |  |
| Sicilian Bergamot | 2 |  |
| Moroccan Rose | 2 |  |
| Egyptian Jasmine | 2 |  |
| Indonesian Patchouli Leaf | 2 |  |
| Litchi | 2 |  |
| Lotus | 2 |  |
| Brazilian Rosewood | 2 |  |
| Blueberry and Anise | 2 |  |
| Floral | 2 |  |
| anchoring the fragrance with its sweet | 2 |  |
| earthy aroma | 2 |  |
| Mimosa | 2 |  |
| Blood Orange | 2 |  |
| Juniper Berries | 2 |  |
| Pimento | 2 |  |
| Sicilian Lemon and Cardamom | 2 |  |
| Geranium and Clary Sage | 2 |  |
| Cypriol Oil or Nagarmotha and Vetiver | 2 |  |
| Lemon Verbena | 2 |  |
| Basil and Artemisia | 2 |  |
| Wormwood | 2 |  |
| Angelica | 2 |  |
| Carnation and Jasmine | 2 |  |
| Fir | 2 |  |
| Pine Tree Needles | 2 |  |
| resins | 2 |  |
| White Flowers | 2 |  |
| Cypress | 2 |  |
| Moss | 2 | HIGH |
| Mint and Lemon | 2 |  |
| Pineapple and Geranium | 2 |  |
| Balsam Fir | 2 |  |
| Incense and Vetiver | 2 |  |
| Moss and Patchouli | 2 |  |
| White Woods and Amber | 2 |  |
| Rose and Jasmine | 2 |  |
| Tomato Leaf | 2 |  |
| Cypriol Oil or Nagarmotha and Sea | 2 |  |
| Amber and Patchouli | 2 |  |
| Jasmine Sambac | 2 |  |
| Sicilian Lemon | 2 |  |
| Cedar and Bellflower | 2 |  |
| Jasmine and White Rose | 2 |  |
| which twists in to | 2 |  |
| Peony | 2 |  |
| Citruses | 2 |  |
| Patchouli Guc Flora Perfume is | 2 |  |
| Blood Mandarin | 1 |  |
| Spicy | 1 |  |
| Indian Patchouli | 1 |  |
| Saffron and Cardamom | 1 |  |
| Amalfi Lemon and Lavender | 1 |  |
| Mirabelle | 1 |  |
| Citruses and Pink Pepper | 1 |  |
| Lily-of-the-Valley and Apple | 1 |  |
| Cedar and White Musk | 1 |  |
| saffron and agarwood (oud) | 1 |  |
| rice | 1 |  |
| geranium and jasmine | 1 |  |
| leather and agarwood (oud) | 1 |  |
| comprised of rose | 1 |  |
| entwined with Spicy floral heart notes and ending harmoniously with enticing floral and warm musky notes settled at | 1 |  |

## Notes
- Priority list from the spec (Oud/Rose/Saffron/Vanilla/Coffee/Bergamot/Citrus/Tobacco/Berries/Amber/Musk/Sandalwood/Patchouli core; Grapefruit/Black Truffle/Truffle/Mexican Chocolate/Chocolate current-screenshot priority; woods/resins, florals, fruit/fresh, spices, gourmand, leather/earthy sets) is cross-referenced above via the Priority column.
- Real note images beyond the 8 already-supplied macro photographs were not fabricated — every note without a real, verified image renders the premium placeholder disc (`.ahx-nn-placeholder` in experience.css), never a manufactured or wrong-ingredient photo.
- `Bergamot`/`Citrus`/`Lemon`/`Orange`/`Grapefruit`/`Mandarin`/`Lime` all resolve to the single supplied citrus macro photo (one real asset covering the citrus family) — listed under Citrus above, not double-counted as separate missing entries.
## Missing notes grouped by layer (Top / Heart / Base)

Re-derived directly from product_notes.layer (top/middle/base) joined to notes, cleaned with the exact same heading-strip/junk-word rules as frontend/src/experience/utils/noteParsing.js, then checked against the same 8-group alias set as frontend/src/experience/utils/noteVisuals.js. Counts are the number of distinct catalogue products carrying that note in that layer specifically. A small number of entries below are not real ingredient names at all but leftover unsplit sentence fragments already present in the source data (e.g. "that intermingle with", "of seaweed") -- these are real defects in the underlying note text itself, not something to map an image to; listed for transparency only, not as notes needing artwork.

### TOP -- 132 unique missing notes

| Note | Product count |
|---|---|
| Patchouli | 21 |
| Apple | 14 |
| Amber | 12 |
| Cedar | 11 |
| Musk | 11 |
| Plum | 11 |
| Cardamom | 10 |
| Lavender | 10 |
| Sandalwood | 10 |
| Vetiver | 10 |
| Jasmine | 9 |
| Ginger | 8 |
| Honey | 7 |
| oak moss | 7 |
| Ozonic | 7 |
| Olibanum | 6 |
| Rosemary | 6 |
| Sea | 6 |
| Tonka Bean | 6 |
| Ylang-Ylang | 6 |
| Leather | 5 |
| Aldehydes | 4 |
| Cashmeran | 4 |
| Clary Sage and Lavender | 4 |
| Coriander | 4 |
| Geranium | 4 |
| Guaiac Wood | 4 |
| Mango | 4 |
| Neroli | 4 |
| Nutmeg | 4 |
| White Musk | 4 |
| Black Currant | 3 |
| Cashmere Wood | 3 |
| Freesia | 3 |
| Mint | 3 |
| Musk and Amber | 3 |
| Peach | 3 |
| that intermingle with | 3 |
| Angelica | 2 |
| Anise | 2 |
| Apricot | 2 |
| Balsam Fir | 2 |
| Basil | 2 |
| Basil and Artemisia | 2 |
| Benzoin | 2 |
| Bitter Almond | 2 |
| Blueberry and Anise | 2 |
| Brazilian Rosewood | 2 |
| cacao | 2 |
| Carnation and Jasmine | 2 |
| Cedar and Bellflower | 2 |
| Cedar and Labdanum | 2 |
| Citruses | 2 |
| Coffee | 2 |
| Cypress | 2 |
| Cypriol Oil or Nagarmotha and Vetiver | 2 |
| Egyptian Jasmine | 2 |
| Elemi resin | 2 |
| Fig and Black Tea | 2 |
| Fir | 2 |
| Floral | 2 |
| Frangipani | 2 |
| Fruity | 2 |
| Gardenia | 2 |
| Geranium and Clary Sage | 2 |
| Geranium and elemi | 2 |
| Geranium and Gentiana | 2 |
| Green | 2 |
| Green Apple | 2 |
| Incense | 2 |
| Incense and Vetiver | 2 |
| Indonesian Patchouli Leaf | 2 |
| Jasmine and Lotus | 2 |
| Juniper and Ginger | 2 |
| Lavender Middle note is Anise Base note is Benzoin | 2 |
| Lily-of-the-Valley | 2 |
| Litchi | 2 |
| Lotus | 2 |
| Magnolia | 2 |
| Mahogany | 2 |
| Mimosa | 2 |
| Mineral | 2 |
| Moss | 2 |
| Moss and Patchouli | 2 |
| Myrrh | 2 |
| Narcissus | 2 |
| Oakmoss | 2 |
| Oakmoss and Violet | 2 |
| of seaweed | 2 |
| Opoponax | 2 |
| Oregano | 2 |
| Patchouli and Orris Root | 2 |
| Pear | 2 |
| Peony | 2 |
| Pimento | 2 |
| Pine Tree Needles | 2 |
| Pineapple | 2 |
| Pineapple and Geranium | 2 |
| Pink Pepper | 2 |
| Pink Pepper and Petitgrain | 2 |
| Pomegranate | 2 |
| Praline | 2 |
| resins | 2 |
| Rum | 2 |
| Sage | 2 |
| Salt | 2 |
| Suede | 2 |
| Tangerine | 2 |
| Thyme and Lilac | 2 |
| Tomato Leaf | 2 |
| Truffle | 2 |
| Vanille | 2 |
| Vetiver and White Musk | 2 |
| Violet | 2 |
| Violet Leaf | 2 |
| which twists in to | 2 |
| White Flowers | 2 |
| white honey and Vetiver | 2 |
| White Woods and Ambe Inspired By Fucking Fabulous | 2 |
| White Woods and Amber | 2 |
| Wormwood | 2 |
| Yuzu | 2 |
| Cedar and White Musk | 1 |
| Citruses and Pink Pepper | 1 |
| entwined with Spicy floral heart notes and ending harmoniously with enticing floral and warm musky notes settled at | 1 |
| geranium and jasmine | 1 |
| Indian Patchouli | 1 |
| Lily-of-the-Valley and Apple | 1 |
| Mirabelle | 1 |
| rice | 1 |
| Spicy | 1 |
| Woody | 1 |

### HEART -- 137 unique missing notes

| Note | Product count |
|---|---|
| Patchouli | 21 |
| Cedar | 15 |
| Vetiver | 14 |
| Amber | 12 |
| Jasmine | 11 |
| Musk | 11 |
| Lavender | 10 |
| Sandalwood | 10 |
| Cashmere Wood | 9 |
| Honey | 9 |
| Leather | 9 |
| Sage | 8 |
| Ylang-Ylang | 8 |
| Hazelnut | 7 |
| oak moss | 7 |
| Incense | 6 |
| Osmanthus | 6 |
| Tonka Bean | 6 |
| Apple | 4 |
| Guaiac Wood | 4 |
| Leather and Patchouli | 4 |
| Olibanum | 4 |
| Opoponax | 4 |
| Pepper | 4 |
| Plum | 4 |
| Violet | 4 |
| White Musk | 4 |
| Musk and Amber | 3 |
| Peach | 3 |
| Amber and Labdanum | 2 |
| Amberwood | 2 |
| Angelica | 2 |
| Angelica & Patchouli | 2 |
| Anise Base note is Benzoin | 2 |
| Balsam Fir | 2 |
| Balsam Fir and Jasmine | 2 |
| Bamboo | 2 |
| Barley | 2 |
| Bay Leaf and Jasmine | 2 |
| Benzoin | 2 |
| Birch | 2 |
| Bitter Almond | 2 |
| Black Tea and Davana | 2 |
| Brandy | 2 |
| Brazilian Rosewood | 2 |
| cacao | 2 |
| Cappuccino | 2 |
| Caramel | 2 |
| Carnation | 2 |
| Carnation and Jasmine | 2 |
| Casablanca Lily | 2 |
| Cashmeran | 2 |
| Cedar and Labdanum | 2 |
| Clary Sage | 2 |
| Coffee | 2 |
| Coriander | 2 |
| Cucumber | 2 |
| Cypress | 2 |
| Cypriol and Olibanum | 2 |
| Cypriol Oil or Nagarmotha and Vetiver | 2 |
| Egyptian Jasmine | 2 |
| Fenugreek | 2 |
| Fig Nectar | 2 |
| Fir | 2 |
| Fire Accord | 2 |
| Floral | 2 |
| Frangipani | 2 |
| Frankincense | 2 |
| Fruity | 2 |
| Gardenia | 2 |
| Geranium | 2 |
| Geranium and Clary Sage | 2 |
| Geranium and elemi | 2 |
| Geranium and Gentiana | 2 |
| Ginger | 2 |
| Incense and Vetiver | 2 |
| Indonesian Patchouli Leaf | 2 |
| Iris and Bourbon Vetiver | 2 |
| Iris and Sage | 2 |
| Japanese Cherry Blossom | 2 |
| Jasmine and Hedione | 2 |
| Jasmine and Laurels | 2 |
| Jasmine and Lotus | 2 |
| Juniper | 2 |
| Labdanum | 2 |
| Leather and Jasmine Sambac | 2 |
| Licorice | 2 |
| Mahogany | 2 |
| Maple syrup | 2 |
| Mimosa | 2 |
| Moss | 2 |
| Moss and Patchouli | 2 |
| Narcissus | 2 |
| Neroli | 2 |
| Nutmeg and Carnation | 2 |
| Oakmoss | 2 |
| Oakmoss and Violet | 2 |
| Orchid | 2 |
| Orris Root and Ylang-Ylang | 2 |
| Patchouli and Orris Root | 2 |
| Patchouli and Vetiver | 2 |
| Pine Tree | 2 |
| Pine Tree Needles | 2 |
| Pineapple | 2 |
| Pineapple and Geranium | 2 |
| Pink Pepper | 2 |
| Praline | 2 |
| Prunol | 2 |
| resins | 2 |
| Rosemary | 2 |
| Rum | 2 |
| Sandalwood and Orris Root | 2 |
| Sea | 2 |
| Sea Salt | 2 |
| Sichuan Pepper | 2 |
| Suede | 2 |
| Tuberose | 2 |
| Vanille | 2 |
| Vetiver and White Musk | 2 |
| Violet Leaf | 2 |
| Watermelon and Coconut | 2 |
| White Flowers | 2 |
| white honey and Vetiver | 2 |
| White Woods and Amber | 2 |
| Wormwood | 2 |
| Black Currant | 1 |
| Brown sugar | 1 |
| Cardamom | 1 |
| Cedar and White Musk | 1 |
| Cypriol Oil or Nagarmotha and Sea | 1 |
| geranium and jasmine | 1 |
| Indian Patchouli | 1 |
| Jasmine Sambac | 1 |
| Lily-of-the-Valley and Apple | 1 |
| rice | 1 |
| Spicy | 1 |
| Woody | 1 |

### BASE -- 89 unique missing notes

| Note | Product count |
|---|---|
| Patchouli | 27 |
| Amber | 25 |
| Sandalwood | 18 |
| Leather | 17 |
| Musk | 17 |
| Cedar | 16 |
| Tonka Bean | 14 |
| Vetiver | 12 |
| oak moss | 11 |
| Amberwood | 9 |
| Ambergris | 8 |
| Benzoin | 6 |
| Guaiac Wood | 6 |
| White Musk | 6 |
| Woody | 6 |
| Myrrh | 4 |
| Oakmoss | 4 |
| Olibanum | 4 |
| Praline | 4 |
| Suede | 4 |
| Vetiver and Oakmoss | 4 |
| Musk and Amber | 3 |
| Akigalawood | 2 |
| Amber and Leather | 2 |
| Amber and Sandalwood | 2 |
| Amberwood and Cacao | 2 |
| Ambrofix™ and Akigalawood | 2 |
| Ambroxan | 2 |
| anchoring the fragrance with its sweet | 2 |
| Balsam Fir | 2 |
| Benzoin and Labdanum | 2 |
| Birch Tar | 2 |
| Cashmeran | 2 |
| Cashmeran and Vetiver | 2 |
| Cedar and Ambroxan | 2 |
| Cedar and Labdanum | 2 |
| Cedarwood | 2 |
| Cedarwood and Benzoin | 2 |
| Cedarwood and Patchouli | 2 |
| Chestnut | 2 |
| Civet | 2 |
| Coconut | 2 |
| Cypress | 2 |
| Cypriol | 2 |
| Cypriol Oil or Nagarmotha and Vetiver | 2 |
| dried fruits and woody | 2 |
| Driftwood and Moss | 2 |
| earthy aroma | 2 |
| Fir | 2 |
| Geranium and Fennel | 2 |
| Honey | 2 |
| Incense | 2 |
| Incense and Vetiver | 2 |
| Iris | 2 |
| Iso E Super and Clary Sage | 2 |
| Labdanum | 2 |
| Licorice | 2 |
| Mahogany | 2 |
| Mexican chocolate | 2 |
| Mimosa and Violet | 2 |
| Moss | 2 |
| Moss and Patchouli | 2 |
| Musk & Iris | 2 |
| Oakmoss and Violet | 2 |
| Opoponax | 2 |
| Orcanox™ | 2 |
| Patchouli and Labdanum | 2 |
| Patchouli and Vetiver | 2 |
| Patchouli Guc Flora Perfume is | 2 |
| Peru Balsam | 2 |
| Pine Tree Needles | 2 |
| resins | 2 |
| Sage and Cedar Tango by | 2 |
| Sandalwood and Patchouli | 2 |
| Sandalwood and Tonka Bean | 2 |
| Smoke | 2 |
| Tonka Bean and Amber | 2 |
| Tonka Bean and Benzoin | 2 |
| Vanille | 2 |
| Vetiver and Musk | 2 |
| Vetiver and Patchouli | 2 |
| Vetiver and White Musk | 2 |
| Vetiver V | 2 |
| white honey and Vetiver | 2 |
| White Woods and Amber | 2 |
| Woodsy | 2 |
| Amber and Patchouli | 1 |
| Cedar and White Musk | 1 |
| Indian Patchouli | 1 |

## Live-app cross-check addendum (bug-fix pass)

Re-verified against the running app (not just this static DB scan) to catch drift between the theoretical gap list above and what `resolveNoteVisual`/`noteVisuals.js` actually renders.

**Bug found and fixed this pass:** `frontend/src/experience/utils/noteVisuals.js`'s word-boundary matcher resolved compound floral notes containing a bare citrus-fruit word — "Orange Blossom and Jasmine", "Orange Blossom", "Turkish Rose and African Orange Flower", "Lime Blossom" — to `note-citrus.png` (the citrus-peel macro photo), because "orange"/"lime" appear as their own word inside those phrases even though orange/lime **blossom** is a floral absolute, a different, unrelated material to citrus peel oil. This was a real "wrong/unrelated ingredient image" bug (worse than an empty circle — a confidently wrong one), reproduced live on the "1 Million Lucky" Product Detail Notes section before the fix. Fixed by adding a small per-key exclusion list (`EXCLUDE.citrus = [/\bblossom\b/, /\bneroli\b/, /\bflower\b/]`) so these compound floral notes now correctly fall through to the honest placeholder, matching the classification this report already had them under (Orange Blossom / Neroli are both listed above as "no image asset"). No new image assets were fabricated — this only stopped a false-positive match to an existing, unrelated asset. Because `ingredientAssets.js` and `bookExperience/data/resolveNoteVisual.js` are thin wrappers around this same file, the fix applies identically everywhere a note image is rendered (Product Detail Notes, Finder concept chips, Book, ScentOrbit).

**Other spot-checks (live, 1 Million Lucky (Attar), which is one of only ~2 of the first 100 API-paginated products with real structured note data):**
- "Ozonic notes" → cleaned to "Ozonic" by `noteParsing.js` (heading-fragment/suffix cleanup, not fabrication) → correctly placeholder (no asset).
- "Grapefruit and Bergamot" → correctly resolves to the citrus asset (both are genuinely citrus-peel materials, no exclusion needed).
- All other notes on this product (Plum, Cashmere Wood, Cedar, Hazelnut, Honey, Amberwood, Patchouli, Vetiver and Oakmoss) correctly render the placeholder disc with the real note name — never an empty circle with no label, never a fabricated name.

**Data reality confirmed, not a bug:** of the first 100 catalogue products returned by `/api/catalogue`, only 2 carry any structured `topNotes`/`middleNotes`/`baseNotes` at all; most real products' note information exists only inside the free-text `description` field, not the structured note columns. All 15 of the Book's curated products (`bookCuratedProducts.js`) were checked directly against the live API by slug and **all 15 have zero structured note data** — this is why the Book's `bk-book-notes-plain` line never renders content for any of the 15; it is not a code bug (the code correctly ties the line to `active = curatedProducts[index]`, the exact same settled product, via `parseFragranceNotes`), it is the underlying catalogue genuinely having no note data for this particular curated set.
