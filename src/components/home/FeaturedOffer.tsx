import Link from "next/link";
import FeatureList from "@/components/home/FeatureList";
import OfferActions from "@/components/home/OfferActions";
import OfferBadge from "@/components/home/OfferBadge";
import OfferPrice from "@/components/home/OfferPrice";
import OfferTerms from "@/components/home/OfferTerms";
import { featuredOffer } from "@/lib/site-content";

// Hot offer section (#hot-offer). The one offer to notice first. The section
// itself sits on plain --color-canvas; its whole content — badge, title,
// price, description, mini-gallery, inclusions, fine print and action pills —
// is wrapped in a single `.hot-offer-card`. The card's --color-canvas-tint
// fill now contrasts against the white section, with an accent border and a
// soft accent halo (the one sanctioned shadow on the site — DESIGN.md →
// Layout & surfaces). Content stacks in one column; the mini-gallery is a
// short horizontal row of thumbnails, not a tall vertical stack.
//
// The smaller .offer-row-featured repeat of this same offer in the Offers list
// has its own scoped hover-lift — a separate exception from this static halo.

export default function FeaturedOffer() {
  const offer = featuredOffer;

  return (
    <section id="hot-offer" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">Popular right now</h2>

        <div className="hot-offer-card mt-8">
          <OfferBadge label="Hot offer" />

          <div className="mt-4 flex items-start justify-between gap-4">
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
            <OfferPrice
              lead={offer.price.lead}
              amount={offer.price.amount}
              accent
            />
          </div>

          <p className="mt-4 max-w-measure text-lead text-muted">
            {offer.summary}
          </p>

          <ul className="mt-6 grid max-w-sm grid-cols-3 gap-3">
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
      </div>
    </section>
  );
}
