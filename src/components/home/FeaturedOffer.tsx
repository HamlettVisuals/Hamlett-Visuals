import Link from "next/link";
import OfferActions from "@/components/home/OfferActions";
import OfferBadge from "@/components/home/OfferBadge";
import OfferPrice from "@/components/home/OfferPrice";
import { featuredOffer } from "@/lib/site-content";

// Hot offer section (#hot-offer). The one offer to notice first — kept
// deliberately compact: badge, title, price, a one-line summary and the two
// action pills, and nothing else. The full inclusions list and fine print
// live only in this offer's repeat row in the Offers list below (behind its
// Show details toggle) — the standalone card never duplicates them.
//
// Layout: a narrow text column on the left, only as wide as it needs to be,
// and a wide row of gallery thumbnails filling the rest of the card to the
// right edge (portrait crops on desktop, a landscape strip when stacked on
// mobile). The card keeps its --color-canvas-tint fill, accent border and
// soft accent halo — the one sanctioned static shadow on the site.

export default function FeaturedOffer() {
  const offer = featuredOffer;

  return (
    <section id="hot-offer" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">Popular right now</h2>

        <div className="hot-offer-card mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="lg:max-w-sm lg:shrink-0">
            <OfferBadge label="Hot offer" />

            <h3 className="mt-4 font-display text-page text-accent">
              <Link
                href={`/portfolio/${offer.categorySlug}`}
                className="link-quiet"
              >
                {offer.title}
              </Link>
            </h3>
            <p className="mt-1 text-caption text-muted">{offer.category}</p>

            <OfferPrice
              lead={offer.price.lead}
              amount={offer.price.amount}
              accent
              align="left"
              className="mt-3"
            />

            <p className="mt-4 text-lead text-muted">{offer.summary}</p>

            <OfferActions
              categorySlug={offer.categorySlug}
              id={offer.id}
              className="mt-6"
            />
          </div>

          <ul className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-0 lg:flex-1">
            {offer.gallery.map((label) => (
              <li
                key={label}
                className="flex aspect-[4/3] items-center justify-center border border-hairline px-2 text-center text-caption text-muted lg:aspect-[3/4]"
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
