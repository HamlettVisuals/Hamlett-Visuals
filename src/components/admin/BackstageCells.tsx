"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button, useBulkUpload, useConfig, useListQuery, useModal } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { ListIntro } from "@/components/admin/CategoryCells";

// Custom pieces of the Backstage list and editor (collections/Backstage.ts).
// The thumbnail cell is a server component of its own
// (BackstageThumbnailCell.tsx); the Live/Hidden pill is the Categories one
// (CategoryCells.tsx). Layout rules (hidden bulk-select column, search,
// Columns and Filters, Payload's own "Create New", "Bulk Upload" and "No
// results") live in app/(payload)/admin-overrides.css under
// .collection-list--backstage.

// Payload's bulk upload drawer, relabelled: pick several photos and videos
// at once. Each gets its title from its file name and, for a video, a
// thumbnail from a frame of it, so she doesn't have to open any of them.
//
// The drawer saves the files one after another in its own order, and each
// new item goes to the top of the feed (Backstage.ts, newItemsFirst), so
// the batch would land reversed. Once they're saved, one call to Payload's
// reorder endpoint (the list's drag uses the same one) moves the rest just
// above the last one saved, which is already on top: the first file in the
// drawer ends up first in the feed.
async function keepPickedOrder(docs: Array<{ id?: unknown; _order?: unknown }>, apiRoute: string) {
  const last = docs.at(-1);
  if (docs.length < 2 || !last?.id || typeof last._order !== "string") return;
  await fetch(`${apiRoute}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionSlug: "backstage",
      orderableFieldName: "_order",
      newKeyWillBe: "less",
      target: { id: last.id, key: last._order },
      docsToMove: docs.slice(0, -1).map((doc) => doc.id),
    }),
  }).catch(() => {});
}

function UploadSeveralButton() {
  const { drawerSlug, setCollectionSlug, setOnSuccess } = useBulkUpload();
  const { openModal } = useModal();
  const { config } = useConfig();
  const router = useRouter();

  return (
    <Button
      buttonStyle="secondary"
      size="medium"
      margin={false}
      onClick={() => {
        setCollectionSlug("backstage");
        setOnSuccess(async (uploaded) => {
          await keepPickedOrder(
            uploaded.map(({ doc }) => doc),
            config.routes.api,
          );
          router.refresh();
        });
        openModal(drawerSlug);
      }}
    >
      Upload several
    </Button>
  );
}

export function BackstageListDescription() {
  return (
    <ListIntro collectionSlug="backstage" addLabel="+ Add item">
      <UploadSeveralButton />
    </ListIntro>
  );
}

// "No backstage items yet" and both buttons, in place of Payload's "No
// results", on the main list only (the Trash tab keeps Payload's own).
export function BackstageEmptyState() {
  const { config } = useConfig();
  const pathname = usePathname() ?? "";
  const { data } = useListQuery();
  const isTrash = pathname.replace(/\/$/, "").endsWith("/trash");
  if (isTrash || data?.totalDocs !== 0) return null;

  return (
    <div className="albums-empty" role="status">
      <h3 className="albums-empty__title">No backstage items yet</h3>
      <p className="albums-empty__text">
        Add photos and short video clips from behind the camera. They show on your Backstage page, newest first.
      </p>
      <div className="categories-list-intro__actions">
        <Button
          el="link"
          to={formatAdminURL({ adminRoute: config.routes.admin, path: "/collections/backstage/create" })}
          buttonStyle="primary"
          size="medium"
          margin={false}
        >
          + Add item
        </Button>
        <UploadSeveralButton />
      </div>
    </div>
  );
}

// Under the dropzone's "Select a file" button, until a file is picked.
export function BackstageUploadHint() {
  return (
    <p className="backstage-upload-hint">
      A photo or a video. Videos under 100MB work best. Export at 1080p.
    </p>
  );
}
