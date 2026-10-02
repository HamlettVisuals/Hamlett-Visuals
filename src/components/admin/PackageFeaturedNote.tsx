"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConfig, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// Top of the package editor (collections/PricingRows.ts → featuredNote, a
// ui field, not stored): whether this package is the one in the homepage's
// "Popular right now" spotlight, with a link to the Featured Offer page
// where that's chosen. Follows the unsaved "Show on website" switch.
// Doesn't assume one package per category.

type Spotlight = { picked: number | null; switchOn: boolean };

export default function PackageFeaturedNote() {
  const { config } = useConfig();
  const { id } = useDocumentInfo();
  const published = useFormFields(([fields]) => fields.published?.value);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase}/globals/featured-offer?depth=0`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((global: { featuredPackage?: number | null; showOnHomepage?: boolean | null } | null) => {
        if (cancelled || !global) return;
        setSpotlight({ picked: global.featuredPackage ?? null, switchOn: global.showOnHomepage !== false });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  if (!spotlight) return null;
  const featured = id !== undefined && id !== null && String(spotlight.picked) === String(id);
  const link = (
    <Link href={formatAdminURL({ adminRoute: config.routes.admin, path: "/globals/featured-offer" })} prefetch={false}>
      Featured Offer
    </Link>
  );

  let text: React.ReactNode;
  if (!featured) {
    text = <>Not featured. To show a package in &lsquo;Popular right now&rsquo; on your homepage, pick it on {link}.</>;
  } else if (!spotlight.switchOn) {
    text = <>Picked as the featured package, but the spotlight is turned off on {link}, so it isn&rsquo;t showing.</>;
  } else if (published === false) {
    text = <>The featured package, but hidden from your site, so the spotlight won&rsquo;t show. Change it on {link}.</>;
  } else {
    text = <>In &lsquo;Popular right now&rsquo; on your homepage. Change it on {link}.</>;
  }

  return (
    <div className={`package-featured-note${featured ? " package-featured-note--featured" : ""}`} role="status">
      {featured && <span className="package-featured-tag">Featured</span>}
      <span>{text}</span>
    </div>
  );
}
