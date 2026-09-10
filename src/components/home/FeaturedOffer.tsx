import Link from "next/link";
import FeatureList from "@/components/home/FeatureList";
import OfferActions from "@/components/home/OfferActions";
import OfferBadge from "@/components/home/OfferBadge";
import OfferPrice from "@/components/home/OfferPrice";
import OfferTerms from "@/components/home/OfferTerms";
import { featuredOffer } from "@/lib/site-content";

// Hot offer section (#hot-offer). The one offer to notice first: title at page
// scale, a full mini-gallery, and the inclusions shown in full (no toggle).
// It carries the same featured treatment as its row in the list below — the
// "Hot offer" badge and the accent-coloured title + price — so the two read
// as the same offer. Emphasis is scale / weight / colour, not a fill or shadow
// (DESIGN.md → flat surfaces; the accent border is scoped to the list row).

export default function FeaturedOffer() {
  const offer = featuredOffer;

  return (
    <section id="hot-offer" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">Popular right now</h2>

        <div className="mt-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-page text-accent">
              <Link
                href={`/portfolio/${offer.categorySlug}`}
                className="link-quiet"
              >
                {offer.title}
              </Link>
            </h3>
            <p className="mt-1 text-caption text-muted">{offer.category}</p>
          </div>
          <OfferPrice lead={offer.price.lead} amount={offer.price.amount} accent />
        </div>

        <p className="mt-4 max-w-measure text-lead text-muted">{offer.summary}</p>

        <div className="mt-5">
          <OfferBadge label="Hot offer" />
        </div>

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

        <OfferTerms className="mt-4 max-w-measure" />

        <OfferActions
          categorySlug={offer.categorySlug}
          id={offer.id}
          className="mt-8"
        />
      </div>
    </section>
  );
}
