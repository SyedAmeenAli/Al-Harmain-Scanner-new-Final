import React, { useState } from "react";
import "@/experience/experience.css";
import SearchScene from "@/experience/components/SearchScene";
import { resolveBookVisual } from "../data/resolveBookVisual";
import { getCustomerDisplayName, getCustomerFamily } from "../data/productDisplay";

const RECENT_KEY = "book_recent_searches";
const MAX_RECENT = 5;

function readRecent() {
  try {
    const raw = window.sessionStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeRecent(list) {
  try {
    window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

/* Dedicated full-screen "chapter" (not a modal) wrapping the existing,
   already-optimized SearchScene — same backend search + same functional
   behavior (recent searches sessionStorage, max 5), new storage key so it
   never collides with the old experience's own recent-search list. */
export default function SearchChapter({ onClose, onOpenProduct, onOpenFinder }) {
  const [recent, setRecent] = useState(readRecent);

  const pushRecent = (q) => {
    if (!q || !q.trim()) return;
    setRecent((prev) => {
      const next = [q, ...prev.filter((r) => r !== q)].slice(0, MAX_RECENT);
      writeRecent(next);
      return next;
    });
  };

  return (
    <div className="bk-chapter" role="dialog" aria-label="Search">
      <SearchScene
        onClose={onClose}
        onOpenDetail={onOpenProduct}
        onOpenConcierge={onOpenFinder}
        recentSearches={recent}
        onPushRecent={pushRecent}
        resolveImage={(p) => resolveBookVisual(p, { context: "thumb" }).primary}
        resolveName={getCustomerDisplayName}
        resolveMeta={getCustomerFamily}
      />
    </div>
  );
}
