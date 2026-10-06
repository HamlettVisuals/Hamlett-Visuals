import type { CollectionConfig, GlobalConfig, PayloadRequest } from "payload";
import { forgetShownPhotos } from "#src/lib/public-photos.ts";

// The public pages are pre-rendered: built once, then served from Next's
// cache. So a save in the Studio has to tell Next to rebuild them, or the
// live site keeps showing what was there at build time. Every collection
// and global the site reads from gets hooks that mark the whole site stale
// (`revalidatePath("/", "layout")`, every page under the (site) root
// layout); each page is then rebuilt with fresh data on its next visit.
// The whole site rather than per-page paths because content is shared
// across pages (Site Settings feeds the layout, the icon and the share
// image; a photo can sit in the hero, a category and an album), and the
// site is small enough that rebuilding a page on its next visit is cheap.
//
// Nothing here uses drafts, so every save is a live change: create,
// update (including the Trash and drag-reorder, both of which save
// through update) and delete all revalidate.
//
// `next/cache` is imported when a save happens rather than at the top:
// this file is part of payload.config.ts's module graph, which the Payload
// CLI loads with plain Node (`--disable-transpile`, see the note at the
// top of that file), and plain Node can't resolve `next/cache`. Inside the
// app, Turbopack bundles it as usual. Outside a Next request (a
// `payload run` script), revalidatePath throws; there's no cache to clear
// there, so that's ignored.

// Admin-only collections: nothing on the public site reads them, so saving
// them (including a visitor's inquiry or testimonial submission) leaves the
// cache alone.
const NOT_ON_SITE = new Set([
  "users",
  "inquiries",
  "clients",
  "checklist-templates",
  "testimonial-submissions",
  "instagram-tokens",
]);

// Also called directly by lib/reorder-within.ts, whose writes skip hooks.
export async function revalidateSite(req: PayloadRequest) {
  // Which photos signed-out visitors may read depends on what the site shows.
  forgetShownPhotos();
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (err) {
    req.payload.logger.debug({ err }, "[revalidate-site] skipped (not inside a Next request)");
  }
}

export function revalidateCollectionsOnChange(collections: CollectionConfig[]): CollectionConfig[] {
  return collections.map((collection) => {
    if (NOT_ON_SITE.has(collection.slug)) return collection;
    const hooks = collection.hooks ?? {};
    return {
      ...collection,
      hooks: {
        ...hooks,
        afterChange: [
          ...(hooks.afterChange ?? []),
          async ({ doc, req }) => {
            await revalidateSite(req);
            return doc;
          },
        ],
        afterDelete: [
          ...(hooks.afterDelete ?? []),
          async ({ doc, req }) => {
            await revalidateSite(req);
            return doc;
          },
        ],
      },
    };
  });
}

// Every global is on the site (Header/Nav and the footer in the layout,
// the rest on the home and booking pages, Site Settings everywhere).
export function revalidateGlobalsOnChange(globals: GlobalConfig[]): GlobalConfig[] {
  return globals.map((global) => {
    const hooks = global.hooks ?? {};
    return {
      ...global,
      hooks: {
        ...hooks,
        afterChange: [
          ...(hooks.afterChange ?? []),
          async ({ doc, req }) => {
            await revalidateSite(req);
            return doc;
          },
        ],
      },
    };
  });
}
