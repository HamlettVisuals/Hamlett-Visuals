"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Button, DefaultCell, useConfig } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";
import { formatAdminURL } from "payload/shared";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";

// Custom pieces of the Categories list view, wired up in
// collections/Categories.ts (admin.components.Description and each field's
// admin.components.Cell). The layout rules (hidden bulk-select column,
// Columns/Filters/Per Page controls, the "Other" row's drag handle) live in
// app/(payload)/admin-overrides.css under .collection-list--categories.

// Only the Categories list (now just its Trash tab): an album titled "Other"
// gets the same slug.
const isOther = (rowData: DefaultCellComponentProps["rowData"], collectionSlug = "categories") =>
  collectionSlug === "categories" && rowData?.slug === OTHER_SESSION_TYPE;

// The collection description, plus (on the main list only) a primary
// "+ Add …" button that stands in for Payload's small "Create New" pill.
// Payload renders this same Description on the edit view and the Trash tab
// too, where the button doesn't belong. Shared with the Albums, Packages
// and Backstage lists; `children` are extra buttons beside it (Backstage's
// "Upload several").
export function ListIntro({
  collectionSlug,
  addLabel,
  children,
}: {
  collectionSlug: string;
  addLabel: string;
  children?: React.ReactNode;
}) {
  const { config } = useConfig();
  const pathname = usePathname();
  const listPath = formatAdminURL({ adminRoute: config.routes.admin, path: `/collections/${collectionSlug}` });
  const isList = pathname?.replace(/\/$/, "") === listPath;
  const collection = config.collections.find((c) => c.slug === collectionSlug);
  const description = collection?.admin?.description;

  return (
    <div className="categories-list-intro">
      {typeof description === "string" && (
        <p className="categories-list-intro__text">{description}</p>
      )}
      {isList && (
        <div className="categories-list-intro__actions">
          <Button
            el="link"
            to={`${listPath}/create`}
            buttonStyle="primary"
            size="medium"
            margin={false}
            className="categories-list-intro__add"
          >
            {addLabel}
          </Button>
          {children}
        </div>
      )}
    </div>
  );
}

export function CategoriesListDescription() {
  return <ListIntro collectionSlug="categories" addLabel="+ Add category" />;
}

// The linked name, with a note on the protected "Other" row.
export function CategoryNameCell(props: DefaultCellComponentProps) {
  return (
    <span className="category-name-cell">
      <DefaultCell {...props} />
      {isOther(props.rowData) && (
        <span className="category-name-cell__note" data-category-other>
          Used by your CRM, not shown on the site
        </span>
      )}
    </span>
  );
}

type PhotoLike = {
  url?: string | null;
  alt?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
};

const photoThumb = (photo: PhotoLike | null | undefined) =>
  photo?.sizes?.thumbnail?.url || photo?.url || null;

// A small square of the cover photo, or a neutral placeholder. The list
// may hand over just the photo's id, so it's fetched when needed.
export function CategoryThumbnailCell({ cellData }: DefaultCellComponentProps) {
  const { config } = useConfig();
  const initial = typeof cellData === "object" && cellData ? (cellData as PhotoLike) : null;
  const photoId = typeof cellData === "number" || typeof cellData === "string" ? cellData : null;
  const [photo, setPhoto] = useState<PhotoLike | null>(initial);

  useEffect(() => {
    if (photoId == null) return;
    let cancelled = false;
    fetch(`${config.serverURL ?? ""}${config.routes.api}/photos/${photoId}?depth=0`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc: PhotoLike | null) => {
        if (!cancelled) setPhoto(doc);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photoId, config.serverURL, config.routes.api]);

  const src = photoThumb(photo);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
    <img className="category-thumb" src={src} alt={photo?.alt ?? ""} loading="lazy" />
  ) : (
    <span className="category-thumb category-thumb--empty" aria-label="No cover photo" title="No cover photo" />
  );
}

// "Live" / "Hidden" pill that toggles `published` in place, on the
// Categories list and the Albums list's table (Trash tab). "Other" gets a
// fixed label instead (the server refuses to publish it anyway).
export function CategoryStatusCell({ cellData, rowData, collectionSlug }: DefaultCellComponentProps) {
  if (isOther(rowData, collectionSlug)) {
    return <span className="category-status category-status--crm">CRM only</span>;
  }
  const title = rowData?.name ?? rowData?.title;
  return (
    <StatusToggle
      collectionSlug={collectionSlug}
      id={rowData.id}
      initialPublished={cellData === true}
      name={typeof title === "string" && title ? title : "this item"}
    />
  );
}

// The pill itself, also used on the Categories & Albums page
// (components/admin/Portfolio), which isn't a Payload table.
export function StatusToggle({
  collectionSlug,
  id,
  initialPublished,
  name,
  onLabel = "Live",
  onChange,
}: {
  collectionSlug: string;
  id: number | string;
  initialPublished: boolean;
  name: string;
  /** The pill's text when shown, e.g. "Published" for testimonials. */
  onLabel?: string;
  /** After a change has saved. */
  onChange?: (published: boolean) => void;
}) {
  const { config } = useConfig();
  const [published, setPublished] = useState(initialPublished);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !published;
    setPublished(next);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `${config.serverURL ?? ""}${config.routes.api}/${collectionSlug}/${id}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: next }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.errors?.[0]?.message ?? "Couldn't change this — try again.");
        }
        onChange?.(next);
      } catch (err) {
        setPublished(!next);
        setError(err instanceof Error ? err.message : "Couldn't change this — try again.");
      }
    });
  };

  return (
    <span className="category-status-cell">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={published}
        aria-label={`${name} is ${published ? "live" : "hidden"}. Click to ${published ? "hide it from" : "show it on"} the site.`}
        title={published ? "Shown on the site. Click to hide." : "Hidden from the site. Click to show."}
        className={`category-status category-status--${published ? "live" : "hidden"}`}
      >
        {published ? onLabel : "Hidden"}
      </button>
      {error && (
        <span className="category-status-cell__error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
