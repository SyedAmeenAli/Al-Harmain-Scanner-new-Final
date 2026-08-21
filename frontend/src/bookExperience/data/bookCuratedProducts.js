/* bookCuratedProducts — the Book's ONLY product source.

   The Fragrance Book is a small curated 15-product experience, completely
   independent of the full 1468-row catalogue. This is a hardcoded, ordered
   list of exactly 15 real products (verified live against
   `SELECT id, name, slug FROM products WHERE id = ?`, read-only SQLite,
   deleted_at IS NULL) paired 1:1 with a dedicated transparent-cutout PNG
   supplied for the Book (source: al_haramain_image_package /
   00_BOOK_DO_NOT_TOUCH / extracted / "Perfume no bg for book" — 15 files,
   copied verbatim, never modified, into
   public/assets/book-experience/curated-15/ under clean lowercase-kebab
   filenames).

   Order: no explicit order was specified for this corrected 15-product list
   (the source folder has no ordering signal of its own); alphabetical by
   the ORIGINAL asset filename is used, which is also the order the table
   below is written in. Nothing here is derived from the catalogue at
   runtime — FragranceBook.jsx looks up each entry's real product object by
   `productSlug` (the catalogue's actual identity key — the public API
   exposes `id: slug`, see catalogueImageMap.js) purely for real
   name/price/sizes/notes/family text, and uses `bookImage` below, never
   resolveBookVisual's floating pool/hash logic, for the rising bottle. */

const BASE = `${process.env.PUBLIC_URL || ""}/assets/book-experience/curated-15`;

export const BOOK_CURATED_PRODUCTS = [
  // 1. Ariba tanika.png -> id 3103, "Arabi Tonka perfume pack"
  { productId: 3103, productSlug: "arabi-tonka-perfume-pack", bookImage: `${BASE}/ariba-tanika.png` },
  // 2. Bin Shaikh perfume.png -> id 3139, "Bin sheikh super 50ml pack"
  { productId: 3139, productSlug: "bin-sheikh-super-50ml-pack", bookImage: `${BASE}/bin-shaikh.png` },
  // 3. Bleu.png -> id 3223, "Bleu 100 ML Pack EDP"
  { productId: 3223, productSlug: "bleu-100-ml-pack-edp", bookImage: `${BASE}/bleu.png` },
  // 4. Charminar Perfume.png -> id 3426, "Charminar theme 100 ml"
  { productId: 3426, productSlug: "charminar-theme-100-ml", bookImage: `${BASE}/charminar.png` },
  // 5. Cowboy.png -> id 3041, "Cowboy theme bottle 100 ml"
  { productId: 3041, productSlug: "cowboy-theme-bottle-100-ml", bookImage: `${BASE}/cowboy.png` },
  // 6. Greatness of oud.png -> id 3100, "Greatness of oud perfume pack"
  { productId: 3100, productSlug: "greatness-of-oud-perfume-pack", bookImage: `${BASE}/greatness-of-oud.png` },
  // 7. Hudson Valley.png -> id 3137, "Hudson valley 50ml pack"
  { productId: 3137, productSlug: "hudson-valley-50ml-pack", bookImage: `${BASE}/hudson-valley.png` },
  // 8. Jaguar.png -> id 3083, "Jaguar perfume 100ml Pack"
  { productId: 3083, productSlug: "jaguar-perfume-100ml-pack", bookImage: `${BASE}/jaguar.png` },
  // 9. Marj Oud.png -> id 3138, "Marj Oud 50ml pack"
  { productId: 3138, productSlug: "marj-oud-50ml-pack", bookImage: `${BASE}/marj-oud.png` },
  // 10. Moon.png -> id 3118, "The moon luxury Perfume pack"
  { productId: 3118, productSlug: "the-moon-luxury-perfume-pack", bookImage: `${BASE}/moon.png` },
  // 11. Night Oud.png -> id 3101, "Night oud perfume pack"
  { productId: 3101, productSlug: "night-oud-perfume-pack", bookImage: `${BASE}/night-oud.png` },
  // 12. Ultra man.png -> id 3224, "Ultra man 100 ML Pack EDP"
  { productId: 3224, productSlug: "ultra-man-100-ml-pack-edp", bookImage: `${BASE}/ultra-man.png` },
  // 13. VIP.png -> id 3225, "Vip Heroes 100 ML Pack EDP"
  { productId: 3225, productSlug: "vip-heroes-100-ml-pack-edp", bookImage: `${BASE}/vip.png` },
  // 14. Woody Oud.png -> id 3102, "Woody oud perfume pack"
  { productId: 3102, productSlug: "woody-oud-perfume-pack", bookImage: `${BASE}/woody-oud.png` },
  // 15. ice.png -> id 3222, "Ice 100 ML Pack EDP"
  { productId: 3222, productSlug: "ice-100-ml-pack-edp", bookImage: `${BASE}/ice.png` },
];

export default BOOK_CURATED_PRODUCTS;
