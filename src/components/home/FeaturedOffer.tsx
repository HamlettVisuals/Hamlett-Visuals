import Link from "next/link";
import FeatureList from "@/components/home/FeatureList";
import { featuredOffer } from "@/lib/site-content";

// Hot offer section (#hot-offer). The one offer to notice first, so it is
// built bigger than the rows in #offers: title at page scale, a full mini-
// gallery, the inclusions shown in full (no toggle), and a solid button CTA
// instead of a text link. The emphasis is all scale / weight / whitespace —
// no background fill, no border box, no shadow (DESIGN.md → flat surfaces).

export default function FeaturedOffer() {
  const offer = featuredOffer;

  return (
    <section id="hot-offer" className="border-t border-hairline">
      <div className="mx-auto max-w-5xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">Popular right now</h2>

        <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h3 className="font-display text-page text-ink">{offer.title}</h3>
          <p className="text-title text-muted tabular-nums">{offer.price}</p>
        </div>
        <p className="mt-2 text-caption text-muted">{offer.category}</p>

        <p className="mt-4 max-w-measure text-lead text-muted">{offer.summary}</p>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {offer.gallery.map((label) => (
            <li
              key={label}
              className="flex aspect-[4/3] items-center justify-center border border-hairline px-2 text-center text-caption text-muted"
            >
              {label}
            </li>
          ))}
        </ul>

        <FeatureList items={offer.features} className="mt-8 max-w-measure" />

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href={`/booking?offer=${offer.id}`} className="btn">
            Book this package
          </Link>
          <Link
            href={`/portfolio/${offer.categorySlug}`}
            className="link text-body text-ink"
          >
            View {offer.category.toLowerCase()} work
          </Link>
        </div>
      </div>
    </section>
  );
}
