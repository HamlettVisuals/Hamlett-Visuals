"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import FeatureList from "@/components/home/FeatureList";
import OfferActions from "@/components/home/OfferActions";
import OfferBadge from "@/components/home/OfferBadge";
import OfferPrice from "@/components/home/OfferPrice";
import OfferTerms from "@/components/home/OfferTerms";
import { resolveCategory } from "@/lib/pricing-rows";
import { serverURL } from "@/lib/server-url";
import {
  LIVE_PREVIEW_DOC_PARAM,
  useScopedCollectionLivePreview,
} from "@/lib/use-scoped-collection-live-preview";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { FeaturedOffer as FeaturedOfferGlobal, PricingRow } from "@/payload-types";

// Offers & pricing section (#offers). Every package shown on the site, in
// the Packages list's drag order — the featured one included. Plain rows are hairline-divided; the featured row is
// an accent-bordered box (.accent-frame, the shared static look) plus
// .offer-row-featured (the hover-lift layered on top, since this row is
// clickable) carrying the same accent title + price as the standalone Hot
// offer section, so it reads as the same offer wherever you meet it.
//
// The featured row's badge (the Featured Offer global's Badge text, same as
// the spotlight's) sits on the row's own border rather than inside its
// padding: absolutely positioned (.offer-row-featured is the positioned
// ancestor), left-aligned with the row's padding, `top-0 -translate-y-1/2` so
// it straddles the border line. It carries its own small neutral drop shadow
// (.offer-badge-on-border) — separate from, and not grown by, the row's
// accent glow/hover-lift; it just travels with the row when that lifts.
// Scoped to this repeated row only, not the standalone Hot offer card.
//
// Row order: title + price → summary → Show / Hide details pill →
// [inclusions + terms, only when expanded] → View gallery / Book pills
// (always shown). The reveal is a plain CSS height/opacity transition
// (.offer-disclosure) — no animation library, still under
// prefers-reduced-motion.
//
// "Featured" and the badge text are the Featured Offer global's, followed
// live while that global is open in Live Preview. With no rows to show the
// whole section is left out rather than leaving a bare heading.
//
// Each row follows the Packages editor's unsaved title, price prefix,
// price, summary and features when it's the package being previewed
// (`?lpDoc=<id>`, see PricingRows.ts livePreview.url), and opens its
// details so feature edits are visible. `package-<id>` is what that preview
// URL scrolls to.

// The preview URL doesn't change while the page is open.
const noSubscribe = () => () => {};

function OfferRow({
  offer,
  isFeatured,
  badge,
}: {
  offer: PricingRow;
  isFeatured: boolean;
  badge: string;
}) {
  const { data } = useScopedCollectionLivePreview<PricingRow>({
    initialData: offer,
    serverURL,
    collectionSlug: "pricing-rows",
    apiRoute: "/hv-studio/api",
    depth: 1,
  });
  // Previewed rows start open; a click still toggles. Read from the URL
  // after hydration (false on the server), so markup matches.
  const isPreviewed = useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).get(LIVE_PREVIEW_DOC_PARAM) === String(offer.id),
    () => false,
  );
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? isPreviewed;
  const detailsId = `offer-details-${offer.id}`;
  // Category links only change after saving; keep the saved one if the
  // unsaved form's category hasn't populated.
  const category = resolveCategory(data.category) ?? resolveCategory(offer.category);
  const categorySlug = category?.slug ?? "";
  const features = (data.features ?? [])
    .map((feature) => feature?.text?.trim() ?? "")
    .filter(Boolean);

  return (
    <li
      id={`package-${offer.id}`}
      className={
        isFeatured
          ? "accent-frame offer-row-featured"
          : "border-t border-hairline py-8 first:pt-10"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            className={`font-display text-title ${
              isFeatured ? "text-accent-text" : "text-ink"
            }`}
          >
            <Link href={`/portfolio/${categorySlug}`} className="link-quiet">
              {data.title}
            </Link>
          </h3>
          {category && (
            <p className="mt-1 text-caption text-muted">{category.name}</p>
          )}
        </div>
        <OfferPrice
          lead={data.priceLead || "From"}
          amount={data.priceAmount}
          accent={isFeatured}
        />
      </div>

      {isFeatured && (
        <div className="absolute left-6 top-0 -translate-y-1/2 sm:left-8">
          <OfferBadge label={badge} className="offer-badge-on-border" />
        </div>
      )}

      <p className="mt-3 max-w-measure text-body text-muted">{data.summary}</p>

      <button
        type="button"
        onClick={() => setToggled(!open)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="link-chip link-chip-inline offer-details-toggle mt-4"
      >
        <span className="link-chip-icon">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m4 6.5 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="link-chip-title">
          {open ? "Hide details" : "Show details"}
        </span>
      </button>

      <div
        id={detailsId}
        className="offer-disclosure"
        data-open={open ? "true" : "false"}
      >
        <div>
          <div className="offer-disclosure-inner">
            {features.length > 0 && <FeatureList items={features} className="pt-4" />}
            <OfferTerms className={features.length > 0 ? "mt-4" : "pt-4"} />
          </div>
        </div>
      </div>

      <OfferActions categorySlug={categorySlug} className="mt-6" />
    </li>
  );
}

export default function Offers({
  pricingRows,
  featuredOffer,
}: {
  pricingRows: PricingRow[];
  featuredOffer: FeaturedOfferGlobal;
}) {
  const { data } = useScopedLivePreview<FeaturedOfferGlobal>({
    initialData: featuredOffer,
    serverURL,
    globalSlug: "featured-offer",
    apiRoute: "/hv-studio/api",
    depth: 0,
  });
  const picked = data.featuredPackage;
  const featuredId = typeof picked === "object" && picked !== null ? picked.id : picked;
  const badge = data.badgeLabel || "Hot offer";

  if (pricingRows.length === 0) return null;

  return (
    <section id="offers" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">
          Offers &amp; pricing
        </h2>
        <ul className="mt-8">
          {pricingRows.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              isFeatured={offer.id === featuredId}
              badge={badge}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
