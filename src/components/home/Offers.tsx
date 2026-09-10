"use client";

import { useState } from "react";
import Link from "next/link";
import FeatureList from "@/components/home/FeatureList";
import { standardOffers, type Offer } from "@/lib/site-content";

// Offers & pricing section (#offers). One row per non-featured offer, split by
// a hairline. Each row shows title, price and a mini-gallery up front; the
// inclusions sit behind a "Show details" toggle, collapsed by default. The
// reveal is a plain CSS height/opacity transition (.offer-disclosure in
// globals.css) — no animation library, and it stays still under
// prefers-reduced-motion.

function OfferRow({ offer }: { offer: Offer }) {
  const [open, setOpen] = useState(false);
  const detailsId = `offer-details-${offer.id}`;

  return (
    <li className="border-t border-hairline py-8 first:pt-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="font-display text-title text-ink">{offer.title}</h3>
            <p className="text-body text-muted tabular-nums">{offer.price}</p>
          </div>
          <p className="mt-1 text-caption text-muted">{offer.category}</p>
          <p className="mt-3 max-w-measure text-body text-muted">
            {offer.summary}
          </p>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={detailsId}
            className="link mt-4 text-body text-ink"
          >
            {open ? "Hide details" : "Show details"}
          </button>

          <div
            id={detailsId}
            className="offer-disclosure"
            data-open={open ? "true" : "false"}
          >
            <div>
              <div className="offer-disclosure-inner">
                <FeatureList items={offer.features} className="pt-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <ul className="flex gap-2">
            {offer.gallery.map((label) => (
              <li
                key={label}
                className="flex aspect-square w-20 items-center justify-center border border-hairline px-1.5 text-center text-caption leading-tight text-muted sm:w-24"
              >
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            <Link
              href={`/booking?offer=${offer.id}`}
              className="link text-body text-ink"
            >
              Book
            </Link>
          </p>
        </div>
      </div>
    </li>
  );
}

export default function Offers() {
  return (
    <section id="offers" className="border-t border-hairline">
      <div className="mx-auto max-w-5xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">Offers &amp; pricing</h2>
        <ul className="mt-8">
          {standardOffers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} />
          ))}
        </ul>
      </div>
    </section>
  );
}
