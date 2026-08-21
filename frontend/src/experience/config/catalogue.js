/* ---------------------------------------------------------
   Catalogue configuration.
   The displayed count must NOT be hardcoded in components.
   Eventually it will be served by the local backend/API.
   Override at build time with REACT_APP_CATALOGUE_COUNT.
   --------------------------------------------------------- */

const DEFAULT_CATALOGUE_COUNT = 0; // live count comes from the API / catalogue; never hardcode

function readConfiguredCount() {
  if (typeof window !== "undefined" && window.__AL_HARAMAIN_CATALOGUE_COUNT__) {
    return Number(window.__AL_HARAMAIN_CATALOGUE_COUNT__);
  }
  const fromEnv = Number(process.env.REACT_APP_CATALOGUE_COUNT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.round(fromEnv);
  }
  return DEFAULT_CATALOGUE_COUNT;
}

export const catalogueConfig = {
  count: readConfiguredCount(),
};

export function formatCount(value = catalogueConfig.count) {
  return new Intl.NumberFormat("en-US").format(value);
}
