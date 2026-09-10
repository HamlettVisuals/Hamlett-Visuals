// Shared inclusions list for the offer sections — always-on in the hot offer,
// revealed behind "Show details" in the pricing rows. Plain list, small muted
// tick per item (a mark, not a numbered marker); no card, no rule between rows.

type FeatureListProps = {
  items: string[];
  className?: string;
};

export default function FeatureList({ items, className = "" }: FeatureListProps) {
  return (
    <ul className={`flex flex-col gap-2 text-body text-muted ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="mt-[0.2em] h-3.5 w-3.5 shrink-0"
          >
            <path
              d="m3 8.5 3.2 3.2L13 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
