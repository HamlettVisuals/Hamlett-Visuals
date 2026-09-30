"use client";

import { useEffect, useState } from "react";
import { DefaultCell, useConfig } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";
import { ListIntro } from "@/components/admin/CategoryCells";

// Custom pieces of the Albums list view (collections/Events.ts, slug
// `events`). The list itself is the Categories & Albums page
// (components/admin/Portfolio); these cells are for Payload's table on the
// Trash tab and in picker drawers. The thumbnail
// cell is a server component of its own (AlbumThumbnailCell.tsx); the
// Live/Hidden pill is the Categories one (CategoryCells.tsx). Layout rules
// live in app/(payload)/admin-overrides.css under .collection-list--events.

export function AlbumsListDescription() {
  return <ListIntro collectionSlug="events" addLabel="+ Add album" />;
}

type CategoryOption = { id: number | string; name: string; slug?: string; deletedAt?: string | null };

// Every category (trashed ones too, so an album in one still gets a name),
// in drag order, fetched once per page load and shared by every row's
// title cell (and AlbumMatchNote.tsx).
let categoriesPromise: Promise<CategoryOption[]> | null = null;
function loadCategories(apiBase: string): Promise<CategoryOption[]> {
  if (!categoriesPromise) {
    const params = new URLSearchParams({
      sort: "_order",
      limit: "100",
      depth: "0",
      trash: "true",
      "select[name]": "true",
      "select[slug]": "true",
      "select[deletedAt]": "true",
    });
    categoriesPromise = fetch(`${apiBase}/categories?${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { docs?: CategoryOption[] } | null) => body?.docs ?? [])
      .catch(() => {
        categoriesPromise = null;
        return [];
      });
  }
  return categoriesPromise;
}

export function useCategories(): CategoryOption[] {
  const { config } = useConfig();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  useEffect(() => {
    let cancelled = false;
    void loadCategories(apiBase).then((docs) => {
      if (!cancelled) setCategories(docs);
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);
  return categories;
}

// "14 Jun 2026", like the Date column. Day-only dates are stored at 12:00
// UTC, so formatted in UTC to keep the day right in every time zone.
const formatListDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

// The linked title, plus a small "Category · date" line that only shows on
// phones, where the Category and Date columns are hidden so the Live/Hidden
// pill stays on screen (admin-overrides.css).
export function AlbumTitleCell(props: DefaultCellComponentProps) {
  const categories = useCategories();
  const category = props.rowData?.category;
  const categoryId = category && typeof category === "object" ? category.id : category;
  const categoryName = categories.find((c) => String(c.id) === String(categoryId))?.name ?? null;
  const meta = [categoryName, formatListDate(props.rowData?.date)].filter(Boolean).join(" · ");
  return (
    <span className="album-title-cell">
      <DefaultCell {...props} />
      {meta && <span className="album-title-cell__meta">{meta}</span>}
    </span>
  );
}

// The `cover` column is a ui field that only exists for the list; it has
// nothing to show in the editor.
export function EmptyField() {
  return null;
}
