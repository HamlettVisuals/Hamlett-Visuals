// Price block for an offer — a small "From" caption above a larger figure.
// Tabular figures so digits line up across rows. `accent` tints the figure
// with --color-accent-text (the AA-safe darker accent) for the featured offer;
// every other row leaves it ink. The "From" caption always stays muted.
// `align` is "right" in the offer-row header (price sits top-right) and "left"
// in the compact standalone Hot offer card (price stacks under the title).

type OfferPriceProps = {
  lead: string;
  amount: string;
  accent?: boolean;
  align?: "left" | "right";
  className?: string;
};

export default function OfferPrice({
  lead,
  amount,
  accent = false,
  align = "right",
  className = "",
}: OfferPriceProps) {
  return (
    <p
      className={`shrink-0 ${
        align === "left" ? "text-left" : "text-right"
      } ${className}`}
    >
      <span className="block text-caption text-muted">{lead}</span>
      <span
        className={`block text-title tabular-nums ${
          accent ? "text-accent-text" : "text-ink"
        }`}
      >
        {amount}
      </span>
    </p>
  );
}
