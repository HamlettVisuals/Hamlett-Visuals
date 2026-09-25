"use client";

import { usePathname } from "next/navigation";
import { Button, DefaultCell, useConfig, useListQuery } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";
import { formatAdminURL } from "payload/shared";
import { useCategories } from "@/components/admin/AlbumCells";
import { ListIntro } from "@/components/admin/CategoryCells";

// Custom pieces of the Packages list view (collections/PricingRows.ts, slug
// `pricing-rows`). The thumbnail cell is a server component of its own
// (PackageThumbnailCell.tsx); the Live/Hidden pill is the Categories one
// (CategoryCells.tsx). Layout rules (hidden bulk-select column, search,
// Columns and Filters, Payload's own "No results") live in
// app/(payload)/admin-overrides.css under .collection-list--pricing-rows.

export function PackagesListDescription() {
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

// The linked title, plus (on phones, where the Category and Price columns
// go) a small line with both. Same look as the Albums list's title cell.
export function PackageTitleCell(props: DefaultCellComponentProps) {
  const categories = useCategories();
  const category = props.rowData?.category;
  const categoryId = category && typeof category === "object" ? category.id : category;
  const categoryName = categories.find((c) => String(c.id) === String(categoryId))?.name ?? null;
  const meta = [categoryName, priceText(props.rowData)].filter(Boolean).join(" · ");
  return (
    <span className="album-title-cell">
      <DefaultCell {...props} />
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
