"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, DefaultCell, useConfig, useListQuery } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";
import { formatAdminURL } from "payload/shared";
import { useCategories } from "@/components/admin/AlbumCells";
import { ListIntro } from "@/components/admin/CategoryCells";
import { availablePackage } from "@/lib/featured-package";
import type { FeaturedOffer } from "@/payload-types";

// Custom pieces of the Packages list view (collections/PricingRows.ts, slug
// `pricing-rows`). The thumbnail cell is a server component of its own
// (PackageThumbnailCell.tsx); the Live/Hidden pill is the Categories one
// (CategoryCells.tsx). Layout rules (hidden bulk-select column, search,
// Columns and Filters, Payload's own "No results") live in
// app/(payload)/admin-overrides.css under .collection-list--pricing-rows.

// Payload shows the collection's Description on the list and the edit
// page alike; the edit page (and "create") gets its own text instead of
// the list's "Drag to set their order".
export function PackagesListDescription() {
  const { config } = useConfig();
  const pathname = usePathname() ?? "";
  const listPath = formatAdminURL({ adminRoute: config.routes.admin, path: "/collections/pricing-rows" });
  const rest = pathname.replace(/\/$/, "").slice(listPath.length);
  const isEditor = /^\/(?!trash$)[^/]+(\/|$)/.test(rest);
  if (isEditor) {
    return (
      <div className="categories-list-intro">
        <p className="categories-list-intro__text">
          One package in the Offers &amp; pricing section of your homepage. The preview shows your changes as you
          type; Save puts them on your site.
        </p>
      </div>
    );
  }
  return <ListIntro collectionSlug="pricing-rows" addLabel="+ Add package" />;
}

// "From $2,800", as the site shows it.
const priceText = (rowData: DefaultCellComponentProps["rowData"]) =>
  [rowData?.priceLead, rowData?.priceAmount]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ");

export function PackagePriceCell({ rowData }: DefaultCellComponentProps) {
  return <span className="package-price-cell">{priceText(rowData)}</span>;
}

// The package in the homepage spotlight, if it's showing: the Featured
// Offer global's package while its "Show on homepage" switch is on, and
// only if the site can show it (lib/featured-package.ts, the rule the
// homepage uses). Fetched once per page load, shared by every row.
let spotlightPromise: Promise<number | null> | null = null;
function loadSpotlight(apiBase: string): Promise<number | null> {
  if (!spotlightPromise) {
    spotlightPromise = fetch(`${apiBase}/globals/featured-offer?depth=2`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((global: FeaturedOffer | null) => {
        if (!global || global.showOnHomepage === false) return null;
        return availablePackage(global.featuredPackage)?.id ?? null;
      })
      .catch(() => {
        spotlightPromise = null;
        return null;
      });
  }
  return spotlightPromise;
}

function useSpotlightPackage(): number | null {
  const { config } = useConfig();
  const [id, setId] = useState<number | null>(null);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  useEffect(() => {
    let cancelled = false;
    void loadSpotlight(apiBase).then((found) => {
      if (!cancelled) setId(found);
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);
  return id;
}

// The title, linked to the package's edit page and underlined like the
// album titles on Categories & Albums. Payload only links a list's first
// column, which here is the photo, so the link is turned on for this cell
// itself. Beside it, a "Featured" tag on the package in the homepage
// spotlight, linking to the Featured Offer page; under it (on phones, where
// the Category and Price columns go) a small line with both. Works for any
// number of packages per category.
export function PackageTitleCell(props: DefaultCellComponentProps) {
  const { config } = useConfig();
  const pathname = usePathname() ?? "";
  const categories = useCategories();
  const spotlightId = useSpotlightPackage();
  const isTrash = pathname.replace(/\/$/, "").endsWith("/trash");
  const category = props.rowData?.category;
  const categoryId = category && typeof category === "object" ? category.id : category;
  const categoryName = categories.find((c) => String(c.id) === String(categoryId))?.name ?? null;
  const meta = [categoryName, priceText(props.rowData)].filter(Boolean).join(" · ");
  const featured = !isTrash && spotlightId !== null && String(props.rowData?.id) === String(spotlightId);
  return (
    <span className="album-title-cell package-title-cell">
      <span className="package-title-cell__line">
        <DefaultCell {...props} link className="package-title-cell__link" />
        {featured && (
          <Link
            href={formatAdminURL({ adminRoute: config.routes.admin, path: "/globals/featured-offer" })}
            prefetch={false}
            className="package-featured-tag"
            title="In the homepage spotlight. Change it on the Featured Offer page."
          >
            Featured
          </Link>
        )}
      </span>
      {meta && <span className="album-title-cell__meta">{meta}</span>}
    </span>
  );
}

// "No packages yet" and the add button, in place of Payload's "No results",
// on the main list only (the Trash tab keeps Payload's "No trashed
// Packages").
export function PackagesEmptyState() {
  const { config } = useConfig();
  const pathname = usePathname() ?? "";
  const { data } = useListQuery();
  const isTrash = pathname.replace(/\/$/, "").endsWith("/trash");
  if (isTrash || data?.totalDocs !== 0) return null;

  return (
    <div className="albums-empty" role="status">
      <h3 className="albums-empty__title">No packages yet</h3>
      <p className="albums-empty__text">
        Add your first package. It shows in the Offers &amp; pricing section of your homepage.
      </p>
      <Button
        el="link"
        to={formatAdminURL({ adminRoute: config.routes.admin, path: "/collections/pricing-rows/create" })}
        buttonStyle="primary"
        size="medium"
        margin={false}
      >
        + Add package
      </Button>
    </div>
  );
}
