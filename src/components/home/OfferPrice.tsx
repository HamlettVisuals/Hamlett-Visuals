// Price block for an offer — a small "From" caption above a larger figure,
// sitting top-right of the row header. Tabular figures so digits line up
// across rows. `accent` tints the figure with --color-accent for the featured
// offer (in both its standalone section and its list row); every other row
// leaves it ink. The "From" caption always stays muted.

type OfferPriceProps = {
  lead: string;
  amount: string;
  accent?: boolean;
  className?: string;
};

export default function OfferPrice({
  lead,
  amount,
  accent = false,
  className = "",
}: OfferPriceProps) {
  return (
    <p className={`shrink-0 text-right ${className}`}>
      <span className="block text-caption text-muted">{lead}</span>
      <span
        className={`block text-title tabular-nums ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {amount}
      </span>
    </p>
  );
}
