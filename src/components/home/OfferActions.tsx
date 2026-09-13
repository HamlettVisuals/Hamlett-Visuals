import Link from "next/link";

// The pair of action pills under every offer — the same in the Featured block
// and in each standard row, so the two sections stay consistent. Both reuse
// the About section's .link-chip pill via its inline layout variant
// (.link-chip-inline): compact, icon + label, no trailing arrow.
//
// The two read as inverses: "View gallery" keeps the light outline treatment
// (no fill, hairline border, dark text); "Book" adds .link-chip-solid — a
// solid --color-accent-text fill with canvas text/icon — so the primary
// action carries the weight.
//
//  - "View gallery" → /portfolio/<categorySlug>   (same target as the title link)
//  - "Book"         → /booking?type=<categorySlug> (pre-fills the booking
//    form's session-type field — see src/components/booking/BookingForm.tsx)

type OfferActionsProps = {
  categorySlug: string;
  className?: string;
};

export default function OfferActions({
  categorySlug,
  className = "",
}: OfferActionsProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <Link
        href={`/portfolio/${categorySlug}`}
        className="link-chip link-chip-inline"
      >
        <span className="link-chip-icon">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect
              x="1.75"
              y="3.25"
              width="12.5"
              height="9.5"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <circle cx="5.5" cy="6.5" r="1.15" fill="currentColor" />
            <path
              d="m2.5 12 3.35-3.35a1 1 0 0 1 1.4 0L9.5 11m0-1.5 1.6-1.6a1 1 0 0 1 1.4 0l1.75 1.75"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="link-chip-title">View gallery</span>
      </Link>

      <Link
        href={`/booking?type=${categorySlug}`}
        className="link-chip link-chip-inline link-chip-solid"
      >
        <span className="link-chip-icon">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect
              x="2"
              y="3.25"
              width="12"
              height="10.75"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M2 6.5h12M5.5 1.75v2.75M10.5 1.75v2.75"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="link-chip-title">Book</span>
      </Link>
    </div>
  );
}
