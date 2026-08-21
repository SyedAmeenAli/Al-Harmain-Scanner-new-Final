/* Phase L.2 — Scent Tray.
   A session-only "want to try in store" list. NOT a cart: no price totals,
   no checkout, no backend write. Backed by sessionStorage so it survives
   navigation within the visit but never persists across store visits or
   devices. Holds only lightweight display items — never full product
   objects — so nothing here can drift from the real catalogue. */

const STORAGE_KEY = "ahx_scent_tray";
const EVENT = "scenttray:change";

function readRaw() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // sessionStorage unavailable (private mode, quota) — fail silently,
    // tray simply won't persist this session.
  }
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // no-op in non-browser contexts
  }
}

/** Returns the current tray as an array of lightweight items. */
export function getTray() {
  return readRaw();
}

/** Adds an item to the tray. No-op if the id is already present (dedup). */
export function addToTray(item) {
  if (!item || item.id == null) return getTray();
  const items = readRaw();
  if (items.some((i) => i.id === item.id)) return items;
  const lite = {
    id: item.id,
    slug: item.slug || item.id,
    name: item.name || "",
    image: item.image || "",
    type: item.type || "",
    priceDisplay: item.priceDisplay || null,
    size: item.size || null,
  };
  const next = [...items, lite];
  writeRaw(next);
  return next;
}

/** Removes an item from the tray by id. */
export function removeFromTray(id) {
  const items = readRaw();
  const next = items.filter((i) => i.id !== id);
  writeRaw(next);
  return next;
}

/** True if an item with this id is currently in the tray. */
export function isInTray(id) {
  if (id == null) return false;
  return readRaw().some((i) => i.id === id);
}

/** Clears the tray entirely (used only if needed — not wired to any
    destructive UI by default). */
export function clearTray() {
  writeRaw([]);
}

/** Subscribe to tray changes. Returns an unsubscribe function.
    Fires on every addToTray/removeFromTray/clearTray call, in this tab
    and (via the native "storage" event) other tabs sharing the session. */
export function subscribeTray(listener) {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener(getTray());
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export const SCENT_TRAY_EVENT = EVENT;
