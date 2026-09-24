"use client";

import Link from "next/link";
import OfferActions from "@/components/home/OfferActions";
import OfferBadge from "@/components/home/OfferBadge";
import OfferPrice from "@/components/home/OfferPrice";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import { availablePackage } from "@/lib/featured-package";
import { resolveCategory, resolveGalleryLabels } from "@/lib/pricing-rows";
import type { FeaturedOffer as FeaturedOfferGlobal } from "@/payload-types";

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
//
// The package is the one picked in the Featured Offer global's "Featured
// package". With None picked, or a package that's since been trashed or
// whose category is hidden or trashed (lib/featured-package.ts), the whole
// section is left out — visitors never see an empty spotlight.

export default function FeaturedOffer({
  featuredOffer,
}: {
  featuredOffer: FeaturedOfferGlobal;
}) {
  // Live Preview — same mechanism as Hero/About/Categories. Depth 2 so a
  // package picked in the unsaved form arrives populated with its category
  // and gallery, the same shape page.tsx fetches.
  const { data } = useScopedLivePreview<FeaturedOfferGlobal>({
    initialData: featuredOffer,
    serverURL,
    globalSlug: "featured-offer",
    apiRoute: "/hv-studio/api",
    depth: 2,
  });

  const offer = availablePackage(data.featuredPackage);
  if (!offer) return null;
  const category = resolveCategory(offer.category);
  const gallery = resolveGalleryLabels(offer.gallery);

  return (
    <section id="hot-offer" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">{data.heading}</h2>

        <div className="hot-offer-card mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="lg:max-w-sm lg:shrink-0">
            <OfferBadge label={data.badgeLabel || "Hot offer"} />

            <h3 className="mt-4 font-display text-page text-accent">
              <Link
                href={category ? `/portfolio/${category.slug}` : "#"}
                className="link-quiet"
              >
                {offer.title}
              </Link>
            </h3>
            {category && (
              <p className="mt-1 text-caption text-muted">{category.name}</p>
            )}

            <OfferPrice
              lead={offer.priceLead || "From"}
              amount={offer.priceAmount}
              accent
              align="left"
              className="mt-3"
            />

            <p className="mt-4 text-lead text-muted">{offer.summary}</p>

            <OfferActions
              categorySlug={category?.slug ?? ""}
              className="mt-6"
            />
          </div>

          <ul className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-0 lg:flex-1">
            {gallery.map((label, i) => (
              <li
                key={i}
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
