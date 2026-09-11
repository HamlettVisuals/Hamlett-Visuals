import Link from "next/link";
import FeatureList from "@/components/home/FeatureList";
import OfferActions from "@/components/home/OfferActions";
import OfferBadge from "@/components/home/OfferBadge";
import OfferPrice from "@/components/home/OfferPrice";
import OfferTerms from "@/components/home/OfferTerms";
import { featuredOffer } from "@/lib/site-content";

// Hot offer section (#hot-offer). The one offer to notice first. The section
// sits on --color-canvas-tint and its whole content — badge, title, price,
// description, mini-gallery, inclusions, fine print and action pills — is
// wrapped in a single `.hot-offer-card`: an accent-bordered box with a soft
// accent halo, the one sanctioned shadow on the site (DESIGN.md → Layout &
// surfaces). The section heading stays outside the card. Content on the left,
// the mini-gallery on the right, stacked on mobile.
//
// The smaller .offer-row-featured repeat of this same offer in the Offers list
// keeps its plain soft border — the halo is scoped to this standalone card.

export default function FeaturedOffer() {
  const offer = featuredOffer;

  return (
    <section id="hot-offer" className="border-t border-hairline bg-canvas-tint">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">Popular right now</h2>

        <div className="hot-offer-card mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
          <div>
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

            <FeatureList items={offer.features} className="mt-6 max-w-measure" />

            <OfferTerms className="mt-4 max-w-measure" />

            <OfferActions
              categorySlug={offer.categorySlug}
              id={offer.id}
              className="mt-8"
            />
          </div>

          <ul className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:content-start lg:self-start">
            {offer.gallery.map((label) => (
              <li
                key={label}
                className="flex aspect-[4/3] items-center justify-center border border-hairline px-2 text-center text-caption text-muted"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
