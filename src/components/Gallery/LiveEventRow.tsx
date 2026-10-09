"use client";

import EventRow, { type EventRowProps } from "./EventRow";
import type { GalleryEvent } from "./types";
import { serverURL } from "@/lib/server-url";
import { useScopedCollectionLivePreview } from "@/lib/use-scoped-collection-live-preview";

type AlbumFields = Pick<GalleryEvent, "id" | "description" | "date"> & { title: string };

// One album row on a category page, following the Albums editor's unsaved
// title, description and date in Live Preview, but only when it's the
// album being edited (`?lpDoc=<id>`, see Events.ts livePreview.url and
// lib/use-scoped-collection-live-preview.ts). The photos, videos and slug
// always come from the server; the row's `id` (its slug) is what the preview URL
// scrolls to.
export default function LiveEventRow({
  event,
  ...rowProps
}: { event: GalleryEvent } & Omit<EventRowProps, "name" | "slug" | "photos" | "videos" | "description" | "date">) {
  const { data } = useScopedCollectionLivePreview<AlbumFields>({
    initialData: {
      id: event.id,
      title: event.name,
      description: event.description,
      date: event.date,
    },
    serverURL,
    collectionSlug: "events",
    apiRoute: "/hv-studio/api",
    depth: 0,
  });

  return (
    <EventRow
      {...rowProps}
      name={data.title}
      slug={event.slug}
      photos={event.photos}
      videos={event.videos}
      description={data.description}
      date={data.date}
    />
  );
}
