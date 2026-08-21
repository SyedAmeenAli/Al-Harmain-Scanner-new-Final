import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] grid place-items-center px-6">
      <div className="text-center max-w-[520px]">
        <p className="label-eyebrow">— Beyond the gallery floor</p>
        <h1 className="font-display text-6xl md:text-7xl leading-[1.05] mt-4">
          This vitrine
          <br />
          <em className="not-italic gold-shimmer">is empty.</em>
        </h1>
        <p className="mt-6 text-[15px] text-[var(--ah-ink)]/70 leading-relaxed">
          The exhibit you were looking for may have been moved or rotated out of the season. Step back into the main hall.
        </p>
        <Link to="/" className="btn-primary mt-10">
          Return to the gallery
        </Link>
      </div>
    </div>
  );
}
