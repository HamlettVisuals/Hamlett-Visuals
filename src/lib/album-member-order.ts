import type { CollectionBeforeChangeHook } from "payload";
import { keyAtEnd } from "#src/lib/manual-order.ts";

// Her order within an album (`albumOrder`, lib/manual-order.ts), for the
// things that belong to one: Photos and Videos. One added to an album
// (uploaded into it, or moved from another), or one saved by older code
// without a key, goes to the end of the album; one in no album has no
// order. Otherwise the key only changes through a drag
// (context.allowOrderChange, set by the reorder endpoint), so a History
// restore or Undo never reshuffles the album.
//
// Part of payload.config.ts's module graph, so no "@/…" imports.

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number | string }).id : (value as number | string | null | undefined);

export function endOfAlbumOrder(collection: "photos" | "videos"): CollectionBeforeChangeHook {
  return async ({ context, data, operation, originalDoc, req }) => {
    const album = idOf("event" in data ? data.event : originalDoc?.event);
    if (!album) {
      data.albumOrder = null;
      return data;
    }
    const moved = operation === "update" && String(album) !== String(idOf(originalDoc?.event) ?? "");
    if (context.allowOrderChange === true && !moved && data.albumOrder) return data;

    const current = originalDoc?.albumOrder as string | null | undefined;
    if (operation === "update" && !moved && current) {
      data.albumOrder = current;
      return data;
    }
    const { docs } = await req.payload.find({
      collection,
      where: {
        event: { equals: album },
        ...(originalDoc?.id ? { id: { not_equals: originalDoc.id } } : {}),
      },
      select: { albumOrder: true },
      pagination: false,
      depth: 0,
      trash: true,
      req,
    });
    data.albumOrder = keyAtEnd(docs.map((doc) => (doc as { albumOrder?: string | null }).albumOrder));
    return data;
  };
}
