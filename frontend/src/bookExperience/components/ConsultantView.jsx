import React from "react";
import useScentTray from "../hooks/useScentTray";

/* Full-screen presentation-only screen — no price total, no order
   submission, no network call. Just the real bottle/name/type/size rows
   for a consultant to read off a shared screen. */
export default function ConsultantView({ onDone }) {
  const { items } = useScentTray();

  return (
    <div className="bk-chapter bk-consultant" role="dialog" aria-label="Consultant view">
      <div className="bk-page">
        <h1 className="bk-h1" style={{ color: "var(--bk-ivory)" }}>I'd Like to Experience These</h1>
        <div style={{ marginTop: "1.5rem" }}>
          {items.map((item) => (
            <div key={item.id} className="bk-tray-item">
              {item.image && <img src={item.image} alt="" loading="lazy" />}
              <div>
                <p className="bk-tray-item-name">{item.name}</p>
                <p className="bk-tray-item-meta">{[item.type, item.size].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="bk-btn bk-btn--primary"
          style={{ marginTop: "2rem", background: "var(--bk-gold)", color: "var(--bk-ink)" }}
          onClick={onDone}
        >
          DONE
        </button>
      </div>
    </div>
  );
}
