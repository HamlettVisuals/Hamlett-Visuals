// Small status badge for the featured offer — a solid accent dot plus a
// small-caps label, on a faint accent tint. Same small-caps tone as the
// .link-chip labels. Non-interactive: the label text carries the meaning, the
// colour only reinforces it. One component, two labels: "Hot offer" on the
// standalone section, "Hot deal" on its row in the list.

type OfferBadgeProps = {
  label: string;
  className?: string;
};

export default function OfferBadge({ label, className = "" }: OfferBadgeProps) {
  return (
    <span className={`offer-badge ${className}`}>
      <span className="offer-badge-dot" aria-hidden="true" />
      <span className="offer-badge-label">{label}</span>
    </span>
  );
}
