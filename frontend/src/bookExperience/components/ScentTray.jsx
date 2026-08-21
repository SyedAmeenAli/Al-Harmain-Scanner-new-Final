import React from "react";
import { X } from "lucide-react";
import useScentTray from "../hooks/useScentTray";

/* Session-only "want to try in store" list. Not a cart: no price totals, no
   checkout, no backend write. Header count only shown when >0 (handled by
   BookHeader), dedup-safe (useScentTray add() no-ops on duplicate id). */
export default function ScentTray({ onClose, onOpenConsultant }) {
  const { items, remove } = useScentTray();

  return (
    <div className="bk-chapter" role="dialog" aria-label="Scent Tray">
      <div className="bk-page">
        <button type="button" className="bk-btn bk-btn--text" onClick={onClose} style={{ alignSelf: "flex-start" }}>
          ← Back
        </button>
        <h1 className="bk-h1" style={{ marginTop: "1rem" }}>Your Scent Tray</h1>
        <p className="bk-body">Fragrances you'd like to smell in store.</p>

        {items.length === 0 ? (
          <p className="bk-body" style={{ marginTop: "2rem" }}>
            Nothing here yet — tap "I WANT TO SMELL THIS" on any page of the book.
          </p>
        ) : (
          <div style={{ marginTop: "1.5rem" }}>
            {items.map((item) => (
              <div key={item.id} className="bk-tray-item">
                {item.image && <img src={item.image} alt="" loading="lazy" />}
                <div>
                  <p className="bk-tray-item-name">{item.name}</p>
                  <p className="bk-tray-item-meta">
                    {[item.type, item.size, item.priceDisplay].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  className="bk-tray-remove"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(item.id)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <button type="button" className="bk-btn bk-btn--primary" style={{ marginTop: "1.5rem" }} onClick={onOpenConsultant}>
            SHOW TO A CONSULTANT
          </button>
        )}
      </div>
    </div>
  );
}
