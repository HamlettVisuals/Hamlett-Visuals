import type { PayloadRequest, Where } from "payload";
import { collectShownPhotoIds } from "#src/lib/photo-usage.ts";

// Which photos a signed-out visitor can read, record and file alike
// (Photos.ts access.read). Not in the Trash, and one of:
//   - in no album (the logo, a testimonial's own photo, unused uploads);
//   - in an album the site shows (published, not in the Trash, in a shown
//     category);
//   - used by something the site shows (a category's cover, a hero slide,
//     the About portrait, a published testimonial…; lib/photo-usage.ts
//     collectShownPhotoIds), so a cover taken from a hidden album still
//     loads.
//
// File requests check this too, so it has to stay cheap: the "used by"
// list is worked out once (a query per collection or global that can hold
// a photo) and kept for a minute, and dropped whenever the site changes
// (revalidateSite, lib/revalidate-site.ts). Each signed-out file request
// then costs Payload's one lookup of that photo, with this rule in it. On
// Vercel each running instance keeps its own copy, so another instance can
// be up to a minute behind after a change.
//
// Part of payload.config.ts's module graph, so no "@/…" imports.

const TTL_MS = 60_000;

let cached: { ids: number[]; at: number } | null = null;
let pending: Promise<number[]> | null = null;

/** Called on every change the site would show (revalidateSite). */
export function forgetShownPhotos() {
  cached = null;
  pending = null;
}

async function shownPhotoIds(req: PayloadRequest): Promise<number[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.ids;
  pending ??= collectShownPhotoIds(req)
    .then((ids) => {
      cached = { ids: [...ids], at: Date.now() };
      return cached.ids;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** The signed-out rule as a query. */
export async function publicPhotoWhere(req: PayloadRequest): Promise<Where> {
  const ids = await shownPhotoIds(req);
  const readable: Where[] = [
    { event: { exists: false } },
    {
      and: [
        { "event.published": { equals: true } },
        { "event.deletedAt": { exists: false } },
        { "event.category.published": { equals: true } },
        { "event.category.deletedAt": { exists: false } },
      ],
    },
  ];
  if (ids.length) readable.push({ id: { in: ids } });
  return { and: [{ deletedAt: { exists: false } }, { or: readable }] };
}
