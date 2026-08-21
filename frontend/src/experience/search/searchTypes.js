/* Phase F — search types & constants.
   Pure data shapes shared by the repository and the engine. */

export const NOTE_IMAGES = {
  oud: "/assets/ingredients/opt/dark-1.jpg",
  rose: "/assets/ingredients/opt/single-2.jpg",
  saffron: "/assets/ingredients/opt/single-3.jpg",
  vanilla: "/assets/ingredients/opt/single-1.jpg",
  musk: "/assets/ingredients/opt/small-1.jpg",
  amber: "/assets/ingredients/opt/small-2.jpg",
  citrus: "/assets/ingredients/opt/fresh.jpg",
  lemon: "/assets/ingredients/opt/fresh.jpg",
  bergamot: "/assets/ingredients/opt/fresh.jpg",
  sandalwood: "/assets/ingredients/opt/dark-1.jpg",
  jasmine: "/assets/ingredients/opt/single-1.jpg",
  lavender: "/assets/ingredients/opt/fresh.jpg",
  spice: "/assets/ingredients/opt/small-3.jpg",
  coffee: "/assets/ingredients/opt/dark-1.jpg",
  leather: "/assets/ingredients/opt/dark-1.jpg",
  tobacco: "/assets/ingredients/opt/dark-1.jpg",
  honey: "/assets/ingredients/opt/single-3.jpg",
  patchouli: "/assets/ingredients/opt/small-2.jpg",
  incense: "/assets/ingredients/opt/dark-1.jpg",
  green: "/assets/ingredients/opt/fresh.jpg",
  floral: "/assets/ingredients/opt/single-2.jpg",
};

export const GENERIC_NOTE_IMAGE = "/assets/ingredients/opt/fresh.jpg";

export function noteImage(note) {
  const key = (note || "").toLowerCase().trim();
  return NOTE_IMAGES[key] || GENERIC_NOTE_IMAGE;
}

export const SORT = {
  RELEVANCE: "relevance",
  AZ: "az",
};

export const QUICK_NOTES = ["oud", "vanilla", "rose", "saffron", "musk", "citrus", "amber"];
export const QUICK_CATEGORIES = ["attar", "perfume", "french", "arabic"];
