"use client";

import { useState } from "react";
import Link from "next/link";
import FeatureList from "@/components/home/FeatureList";
import OfferActions from "@/components/home/OfferActions";
import OfferBadge from "@/components/home/OfferBadge";
import OfferPrice from "@/components/home/OfferPrice";
import OfferTerms from "@/components/home/OfferTerms";
import { standardOffers, type Offer } from "@/lib/site-content";

// Offers & pricing section (#offers). Every offer, in category order — the
// featured one included. Plain rows are hairline-divided; the featured row is
// an accent-bordered box (.offer-row-featured) carrying the same "Hot deal"
// badge and accent title + price as the standalone Hot offer section, so it
// reads as the same offer wherever you meet it.
//
// Row order: title + price → summary → badge (featured only) → Show / Hide
// details pill → [inclusions + terms, only when expanded] → View gallery /
// Book pills (always shown). The reveal is a plain CSS height/opacity
// transition (.offer-disclosure) — no animation library, still under
// prefers-reduced-motion.

function OfferRow({ offer }: { offer: Offer }) {
  const [open, setOpen] = useState(false);
  const detailsId = `offer-details-${offer.id}`;
  const isFeatured = offer.featured === true;

  return (
    <li
      className={
        isFeatured
          ? "offer-row-featured"
          : "border-t border-hairline py-8 first:pt-10"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            className={`font-display text-title ${
              isFeatured ? "text-accent" : "text-ink"
            }`}
          >
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
          accent={isFeatured}
        />
      </div>

      <p className="mt-3 max-w-measure text-body text-muted">{offer.summary}</p>

      {isFeatured && (
        <div className="mt-4">
          <OfferBadge label="Hot deal" />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
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
            <FeatureList items={offer.features} className="pt-4" />
            <OfferTerms className="mt-4" />
          </div>
        </div>
      </div>

      <OfferActions
        categorySlug={offer.categorySlug}
        id={offer.id}
        className="mt-6"
      />
    </li>
  );
}

export default function Offers() {
  return (
    <section id="offers" className="border-t border-hairline">
      <div className="mx-auto max-w-5xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">
          Offers &amp; pricing
        </h2>
        <ul className="mt-8">
          {standardOffers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} />
          ))}
        </ul>
      </div>
    </section>
  );
}
