"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Button, DefaultCell, useConfig, useListQuery } from "@payloadcms/ui";
import type { DefaultCellComponentProps, Where } from "payload";
import { formatAdminURL } from "payload/shared";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";
import { ListIntro } from "@/components/admin/CategoryCells";

// Custom pieces of the Albums list view (collections/Events.ts, slug
// `events`). The thumbnail cell is a server component of its own
// (AlbumThumbnailCell.tsx); the Live/Hidden pill is the Categories one
// (CategoryCells.tsx). Layout rules (hidden bulk-select column, Columns and
// Filters buttons, Payload's own "No results") live in
// app/(payload)/admin-overrides.css under .collection-list--events.

export function AlbumsListDescription() {
  return <ListIntro collectionSlug="events" addLabel="+ Add album" />;
}

type CategoryOption = { id: number | string; name: string; slug?: string; deletedAt?: string | null };

// Every category (trashed ones too, so an album in one still gets a name),
// in drag order, fetched once per page load and shared by the filter
// dropdown and every row's title cell.
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

function useCategories(): CategoryOption[] {
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

// Finds `category: { equals }` anywhere in the list's where (Payload may
// wrap it in and/or).
function selectedCategory(where: Where | undefined): string {
  if (!where || typeof where !== "object") return "";
  const own = (where.category as { equals?: unknown } | undefined)?.equals;
  if (own !== undefined && own !== null) return String(own);
  for (const key of ["and", "or"] as const) {
    const list = where[key];
    if (Array.isArray(list)) {
      for (const part of list) {
        const found = selectedCategory(part);
        if (found) return found;
      }
    }
  }
  return "";
}

// Sits between the search bar and the table: a simple "All categories"
// dropdown in place of Payload's Filters builder, and the empty states.
// The filter goes through Payload's own list query (the URL's
// where[category][equals]), so it combines with search, sort and paging.
export function AlbumsListToolbar() {
  const { config } = useConfig();
  const pathname = usePathname() ?? "";
  const { data, query, refineListData } = useListQuery();
  // Only categories albums can go in: not "Other" (CRM-only), not trashed.
  const categories = useCategories().filter((c) => c.slug !== OTHER_SESSION_TYPE && !c.deletedAt);
  const selectId = useId();
  const isTrash = pathname.replace(/\/$/, "").endsWith("/trash");
  const category = selectedCategory(query?.where);
  const search = typeof query?.search === "string" ? query.search.trim() : "";

  const onCategoryChange = (value: string) => {
    void refineListData({ where: value ? { category: { equals: value } } : {}, page: 1 });
  };

  const isEmpty = data?.totalDocs === 0;
  const filtered = Boolean(search || category);
  const categoryName = categories.find((c) => String(c.id) === category)?.name;

  return (
    <>
      <div className="albums-toolbar">
        <label htmlFor={selectId} className="albums-toolbar__label">
          Category
        </label>
        <select
          id={selectId}
          className="albums-toolbar__select"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isEmpty && !isTrash && (
        <div className="albums-empty" role="status">
          {filtered ? (
            <>
              <h3 className="albums-empty__title">
                {search ? "No albums match your search" : `No albums in ${categoryName ?? "this category"} yet`}
              </h3>
              <p className="albums-empty__text">
                {search && category
                  ? `Nothing called "${search}" in ${categoryName ?? "this category"}.`
                  : search
                    ? `Nothing called "${search}".`
                    : "Choose another category, or add an album to this one."}
              </p>
              <button
                type="button"
                className="albums-empty__clear"
                // "" rather than undefined: Payload's search box only resets
                // its own text when the URL's search changes to a string.
                onClick={() => void refineListData({ search: "", where: {}, page: 1 })}
              >
                Show all albums
              </button>
            </>
          ) : (
            <>
              <h3 className="albums-empty__title">No albums yet</h3>
              <p className="albums-empty__text">
                Add your first album, then give it photos. It shows on its category&apos;s page.
              </p>
              <Button
                el="link"
                to={formatAdminURL({ adminRoute: config.routes.admin, path: "/collections/events/create" })}
                buttonStyle="primary"
                size="medium"
                margin={false}
              >
                + Add album
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
