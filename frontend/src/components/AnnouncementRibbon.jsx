import { useEffect, useState } from "react";

const messages = [
  "Complimentary courier across India on orders over ₹1,500",
  "Discover the Museum of Scent — handpicked from Dubai's finest houses",
  "New chapter — Oud Atelier now open in the gallery",
];

export default function AnnouncementRibbon() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      data-testid="announcement-ribbon"
      className="w-full bg-[var(--ah-ink)] text-[var(--ah-ivory)] py-2.5 text-[11px] tracking-[0.28em] uppercase flex items-center justify-center"
    >
      <span className="opacity-90">{messages[idx]}</span>
    </div>
  );
}
