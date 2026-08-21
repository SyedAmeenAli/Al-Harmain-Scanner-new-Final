export const HOME = {
  emergentLink: "home-emergent-link",
  hero: "home-hero",
  heroCta: "home-hero-cta",
  heroSecondaryCta: "home-hero-secondary-cta",
};

export const HEADER = {
  root: "site-header",
  logo: "header-logo",
  navAttars: "nav-attars",
  navPerfumes: "nav-perfumes",
  navCollections: "nav-collections",
  navFinder: "nav-fragrance-finder",
  navGifting: "nav-gifting",
  navJournal: "nav-journal",
  searchToggle: "header-search-toggle",
  cartToggle: "header-cart-toggle",
  cartCount: "header-cart-count",
  mobileMenuToggle: "header-mobile-toggle",
};

export const MEGAMENU = {
  panel: "megamenu-panel",
};

export const SEARCH = {
  overlay: "search-overlay",
  close: "search-close",
  input: "search-input",
  resultsList: "search-results",
  resultItem: (slug) => `search-result-${slug}`,
};

export const CART = {
  drawer: "cart-drawer",
  close: "cart-close",
  item: (id) => `cart-item-${id}`,
  itemIncrease: (id) => `cart-item-inc-${id}`,
  itemDecrease: (id) => `cart-item-dec-${id}`,
  itemRemove: (id) => `cart-item-remove-${id}`,
  giftWrap: "cart-gift-wrap",
  giftMessage: "cart-gift-message",
  couponInput: "cart-coupon-input",
  couponApply: "cart-coupon-apply",
  subtotal: "cart-subtotal",
  total: "cart-total",
  checkout: "cart-checkout",
  empty: "cart-empty",
  emptyCta: "cart-empty-cta",
};

export const PRODUCT = {
  card: (slug) => `product-card-${slug}`,
  cardCta: (slug) => `product-card-cta-${slug}`,
  cardLink: (slug) => `product-card-link-${slug}`,
  pageRoot: "pdp-root",
  pageTitle: "pdp-title",
  sizeButton: (label) => `pdp-size-${label.replace(/\s+/g, "-")}`,
  addToCart: "pdp-add-to-cart",
  tabDescription: "pdp-tab-description",
  tabNotes: "pdp-tab-notes",
  tabLongevity: "pdp-tab-longevity",
  tabUsage: "pdp-tab-usage",
  tabShipping: "pdp-tab-shipping",
  noteNode: (group, idx) => `pdp-note-${group}-${idx}`,
};

export const COLLECTION = {
  root: "collection-root",
  title: "collection-title",
  filterCategory: (value) => `filter-category-${value}`,
  filterFamily: (value) => `filter-family-${value}`,
  filterStatus: (value) => `filter-status-${value}`,
  filterSort: "filter-sort",
  filterReset: "filter-reset",
  grid: "collection-grid",
  empty: "collection-empty",
};

export const FINDER = {
  root: "finder-root",
  optionFamily: (v) => `finder-family-${v}`,
  optionMood: (v) => `finder-mood-${v}`,
  optionIntensity: (v) => `finder-intensity-${v}`,
  optionOccasion: (v) => `finder-occasion-${v}`,
  next: "finder-next",
  back: "finder-back",
  reveal: "finder-reveal",
  resultCard: (slug) => `finder-result-${slug}`,
};

export const GIFT = {
  root: "gift-root",
  card: (slug) => `gift-card-${slug}`,
};

export const FOOTER = {
  root: "site-footer",
  newsletterInput: "footer-newsletter-input",
  newsletterSubmit: "footer-newsletter-submit",
};

export const ABOUT = {
  pageRoot: "about-root",
  hero: "about-hero",
  heritage: "about-heritage",
  chapters: "about-chapters",
  hallmarks: "about-hallmarks",
  ctaGallery: "about-cta-gallery",
  ctaFinder: "about-cta-finder",
};
