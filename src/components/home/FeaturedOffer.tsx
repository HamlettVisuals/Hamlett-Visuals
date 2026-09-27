"use client";

import Link from "next/link";
import HoverZoomImage from "@/components/HoverZoomImage";
import OfferActions from "@/components/home/OfferActions";
import OfferBadge from "@/components/home/OfferBadge";
import OfferPrice from "@/components/home/OfferPrice";
import { generateAltText } from "@/lib/generate-alt-text";
import { serverURL } from "@/lib/server-url";
import { useScopedCollectionLivePreview } from "@/lib/use-scoped-collection-live-preview";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import { availablePackage } from "@/lib/featured-package";
import { resolveCategory, type SamplePhoto, type SamplePhotosByPackage } from "@/lib/pricing-rows";
import type { FeaturedOffer as FeaturedOfferGlobal, PricingRow } from "@/payload-types";

// Hot offer section (#hot-offer). The one offer to notice first — kept
// deliberately compact: badge, title, price, a one-line summary and the two
// action pills, and nothing else. The full inclusions list and fine print
// live only in this offer's repeat row in the Offers list below (behind its
// Show details toggle) — the standalone card never duplicates them.
//
// Layout: a narrow text column on the left, only as wide as it needs to be,
// and a wide row of sample photos from the package's album filling the rest
// of the card to the right edge (portrait crops on desktop, a landscape
// strip when stacked on mobile). With no album, or an album without photos,
// the photo row is left out and the text takes the card — never empty
// placeholder boxes. The card keeps its --color-canvas-tint fill and soft
// accent halo — the one sanctioned static shadow on the site.
//
// The package is the one picked in the Featured Offer global's "Featured
// package". With None picked, or a package that's since been hidden or
// trashed or whose category is hidden or trashed (lib/featured-package.ts),
// the whole section is left out — visitors never see an empty spotlight.

export default function FeaturedOffer({
  featuredOffer,
  samplePhotos,
}: {
  featuredOffer: FeaturedOfferGlobal;
  samplePhotos: SamplePhotosByPackage;
}) {
  // Live Preview of this global — same mechanism as Hero/About/Categories.
  // Depth 2 so a package picked in the unsaved form arrives populated with
  // its category, the same shape page.tsx fetches.
  const { data } = useScopedLivePreview<FeaturedOfferGlobal>({
    initialData: featuredOffer,
    serverURL,
    globalSlug: "featured-offer",
    apiRoute: "/hv-studio/api",
    depth: 2,
  });

  const offer = availablePackage(data.featuredPackage);
  if (!offer) return null;

  return (
    <section id="hot-offer" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">{data.heading}</h2>
        {/* Keyed so picking another package in the preview starts fresh. */}
        <FeaturedOfferCard
          key={offer.id}
          offer={offer}
          badge={data.badgeLabel || "Hot offer"}
          photos={samplePhotos[offer.id] ?? []}
        />
      </div>
    </section>
  );
}

// The card itself. When this package is open in the Packages editor's Live
// Preview (`?lpDoc=<id>`), it follows the unsaved title, price prefix,
// price and summary too, like its row in Offers & pricing.
function FeaturedOfferCard({
  offer,
  badge,
  photos,
}: {
  offer: PricingRow;
  badge: string;
  photos: SamplePhoto[];
}) {
  const { data } = useScopedCollectionLivePreview<PricingRow>({
    initialData: offer,
    serverURL,
    collectionSlug: "pricing-rows",
    apiRoute: "/hv-studio/api",
    depth: 1,
  });
  const category = resolveCategory(data.category) ?? resolveCategory(offer.category);
  const categorySlug = category?.slug ?? "";

  return (
    <div className="hot-offer-card mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <div className={photos.length ? "lg:max-w-sm lg:shrink-0" : "max-w-measure"}>
        <OfferBadge label={badge} />

        <h3 className="mt-4 font-display text-page text-accent">
          <Link href={`/portfolio/${categorySlug}`} className="link-quiet">
            {data.title}
          </Link>
        </h3>
        {category && <p className="mt-1 text-caption text-muted">{category.name}</p>}

        <OfferPrice
          lead={data.priceLead || "From"}
          amount={data.priceAmount}
          accent
          align="left"
          className="mt-3"
        />

        <p className="mt-4 text-lead text-muted">{data.summary}</p>

        <OfferActions categorySlug={categorySlug} className="mt-6" />
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-0 lg:flex-1">
          {photos.map((photo) => (
            <li key={photo.id}>
              <HoverZoomImage
                src={photo.url}
                alt={
                  photo.alt ||
                  generateAltText({ kind: "category", category: category?.name ?? "Portrait" })
                }
                sizes="(min-width: 1024px) 240px, 30vw"
                className="aspect-[4/3] w-full lg:aspect-[3/4]"
                focal={photo}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
