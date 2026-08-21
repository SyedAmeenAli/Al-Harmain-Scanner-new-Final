/* Book Experience Scent Tray — session-only, new storage namespace
   ("book_scent_tray") so it never collides with the old experience's
   "ahx_scent_tray" if that module is still mounted anywhere. Behavior is
   intentionally identical to experience/utils/scentTray.js (add/dedup/
   remove/persist-through-reload, no price totals, no backend write) — the
   API shape is duplicated rather than imported so the two experiences stay
   fully independent for rollback safety. */

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "book_scent_tray";
const EVENT = "book-scenttray:change";

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
    // sessionStorage unavailable — tray simply won't persist this session
  }
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // no-op
  }
}

export function getTray() {
  return readRaw();
}

export function addToTray(item) {
  if (!item || item.id == null) return getTray();
  const items = readRaw();
  if (items.some((i) => i.id === item.id)) return items;
  const lite = {
    id: item.id,
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

export function removeFromTray(id) {
  const items = readRaw();
  const next = items.filter((i) => i.id !== id);
  writeRaw(next);
  return next;
}

export function isInTray(id) {
  if (id == null) return false;
  return readRaw().some((i) => i.id === id);
}

export function clearTray() {
  writeRaw([]);
}

/* React hook — subscribes to tray changes across this tab (and other tabs
   sharing the session, via the native "storage" event). */
export default function useScentTray() {
  const [items, setItems] = useState(() => getTray());

  useEffect(() => {
    const handler = () => setItems(getTray());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const add = useCallback((item) => setItems(addToTray(item)), []);
  const remove = useCallback((id) => setItems(removeFromTray(id)), []);
  const has = useCallback((id) => items.some((i) => i.id === id), [items]);

  return { items, add, remove, has, clear: () => setItems(clearTray()) };
}
