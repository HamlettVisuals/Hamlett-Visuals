import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { publicPhotoWhere } from "#src/lib/public-photos.ts";
import { RASTER_IMAGE_MIME_TYPES } from "#src/lib/raster-image-types.ts";
import { removeRefusedUpload } from "#src/lib/upload-limits.ts";
import { resizeLargePhotos } from "#src/lib/photo-resize.ts";
import { PHOTO_MAX_MB } from "#src/lib/upload-sizes.ts";
import { keyAtEnd } from "#src/lib/manual-order.ts";
import { findPhotoUsage, findUnusedPhotos } from "#src/lib/photo-usage.ts";
import { reorderWithin } from "#src/lib/reorder-within.ts";

// The ✕ on a photo's edit page (components/admin/PhotoNav.tsx).
const PHOTO_CLOSE_BUTTON = "/components/admin/PhotoNav#PhotoCloseButton";

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number | string }).id : (value as number | string | null | undefined);

// Her order within the album (`albumOrder`, lib/manual-order.ts). A photo
// added to an album (uploaded into it, or moved from another), or one saved
// by older code without a key, goes to the end of the album; a photo in no
// album has no order. Otherwise the key only changes through a drag
// (context.allowOrderChange, set by the reorder endpoint), so a History
// restore or Undo never reshuffles the album.
const setPhotoOrder: CollectionBeforeChangeHook = async ({ context, data, operation, originalDoc, req }) => {
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
    collection: "photos",
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
  data.albumOrder = keyAtEnd(docs.map((doc) => doc.albumOrder));
  return data;
};

export const Photos: CollectionConfig = {
  slug: "photos",
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  admin: {
    // Undo / Redo / Discard next to Save — see components/admin/EditHistory.tsx.
    components: {
      edit: {
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
          // Breadcrumbs back to the photo's album, or to Unused photos.
          "/components/admin/PhotoNav#PhotoStepNav",
        ],
      },
      // ✕ in the top bar of the Edit and History tabs: back to the photo's
      // album, or to Unused photos on Categories & Albums. There's no Photos
      // list page any more (src/proxy.ts). See components/admin/PhotoNav.tsx.
      views: {
        edit: {
          default: { actions: [PHOTO_CLOSE_BUTTON] },
          versions: { actions: [PHOTO_CLOSE_BUTTON] },
          version: { actions: [PHOTO_CLOSE_BUTTON] },
        },
      },
    },
    hideAPIURL: true,
    useAsTitle: "alt",
    defaultColumns: ["filename", "alt", "event"],
    description:
      "A photo on your site: in an album, or used as a cover, hero slide, portrait or elsewhere.",
  },
  access: {
    // Signed out (the site's visitors, and the image optimizer, which never
    // has a session): only photos the site can show, records and files
    // alike. See lib/public-photos.ts.
    read: async ({ req }) => (req.user ? true : publicPhotoWhere(req)),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: RASTER_IMAGE_MIME_TYPES,
    // Both are Payload's defaults, spelled out because the site relies on
    // them: the hero (components/home/Hero.tsx) positions each photo around
    // its focal point, and cropping is how she trims a photo in the studio.
    focalPoint: true,
    crop: true,
    // Browsers may keep a photo file for an hour, then check back with its
    // ETag (a quick 304 when unchanged). Not longer, and not `immutable`: a
    // file's URL can come to serve different pixels — cropping in the studio
    // re-saves under the same filename, and a permanently deleted photo's
    // filename can be reused. Only the browser caches it (no s-maxage), so
    // there's no CDN copy to clear. The R2 plugin's file handler applies this.
    modifyResponseHeaders: ({ headers }) => {
      headers.set("Cache-Control", "public, max-age=3600");
      return headers;
    },
    imageSizes: [
      {
        name: "thumbnail",
        width: 400,
        height: 400,
        fit: "cover",
      },
    ],
  },
  // Size cap on save (upload-limits.ts); a refused file is removed from R2.
  hooks: {
    // Size cap, then shrinks a photo over 3000px and removes GPS data.
    beforeOperation: [resizeLargePhotos({ maxMB: PHOTO_MAX_MB, noun: "photo", plural: "Photos" })],
    afterError: [removeRefusedUpload],
    beforeChange: [setPhotoOrder],
  },
  endpoints: [
    {
      // A drag (or "Set as album cover") in the album page's photo grid:
      // POST /api/photos/reorder-photos { album, order: [ids], moved: id }.
      // See lib/reorder-within.ts.
      path: "/reorder-photos",
      method: "post",
      handler: async (req) => {
        const body = (await req.json?.().catch(() => null)) as { album?: unknown; order?: unknown; moved?: unknown } | null;
        const isId = (value: unknown): value is number => Number.isInteger(value);
        if (!body || !isId(body.album) || !isId(body.moved) || !Array.isArray(body.order) || !body.order.every(isId)) {
          return Response.json({ error: "Invalid reorder." }, { status: 400 });
        }
        return reorderWithin({
          req,
          target: { collection: "photos", field: "albumOrder", scope: { field: "event", id: body.album } },
          order: body.order,
          moved: body.moved,
        });
      },
    },
    {
      // The Unused photos section on Categories & Albums (in no album, not
      // in the Trash, used nowhere; lib/photo-usage.ts):
      // GET /api/photos/unused -> { photos: [...] }.
      path: "/unused",
      method: "get",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized." }, { status: 401 });
        return Response.json({ photos: await findUnusedPhotos(req) });
      },
    },
    {
      // "Move to Trash" in the Unused photos section:
      // POST /api/photos/trash-unused { ids } -> { trashed, skipped }.
      // Each photo is checked again first: one that has since been added to
      // an album or used somewhere is left alone and reported, so a page
      // left open can't trash a photo that's now in use. The rest go to the
      // Trash the same way Payload's Delete does (setting deletedAt), with
      // this user's permissions and the collection's hooks.
      path: "/trash-unused",
      method: "post",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized." }, { status: 401 });
        const body = (await req.json?.().catch(() => null)) as { ids?: unknown } | null;
        const raw = Array.isArray(body?.ids) ? (body.ids as unknown[]) : [];
        const ids = raw.filter((id): id is number => Number.isInteger(id));
        if (!ids.length || ids.length !== raw.length) return Response.json({ error: "Invalid photos." }, { status: 400 });
        const stillUnused = new Set((await findUnusedPhotos(req, ids)).map((photo) => photo.id));
        const trashed: number[] = [];
        const skipped: number[] = [];
        for (const id of ids) {
          if (!stillUnused.has(id)) {
            skipped.push(id);
            continue;
          }
          await req.payload.update({
            collection: "photos",
            id,
            data: { deletedAt: new Date().toISOString() },
            overrideAccess: false,
            user: req.user,
            req,
          });
          trashed.push(id);
        }
        return Response.json({ trashed, skipped });
      },
    },
    {
      // Where else the site shows this photo, for the album page's "Delete
      // photo…" warning: GET /api/photos/<id>/usage -> { uses: [text] }.
      path: "/:id/usage",
      method: "get",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized." }, { status: 401 });
        const id = Number(req.routeParams?.id);
        if (!Number.isInteger(id)) return Response.json({ error: "Invalid photo." }, { status: 400 });
        return Response.json({ uses: await findPhotoUsage(req, id) });
      },
    },
  ],
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  fields: [
    {
      // The photo in every crop shape the site uses, right under the file
      // box and its Edit Image button. Not stored. See CropPreview.tsx.
      name: "cropPreview",
      type: "ui",
      admin: {
        components: {
          Field: "/components/admin/CropPreview#default",
        },
      },
    },
    {
      name: "alt",
      type: "text",
      required: true,
      admin: {
        description:
          "A short, plain description of what's in the photo (e.g. \"Bride and groom laughing during the first dance\"). Used by screen readers for visually impaired visitors, and helps the photo show up in search results — every photo needs one.",
      },
    },
    {
      name: "caption",
      type: "text",
      admin: {
        description:
          "An optional caption shown under the photo when someone clicks to view it larger.",
      },
    },
    {
      name: "event",
      type: "relationship",
      relationTo: "events",
      admin: {
        description: "Which shoot this photo belongs to, if any.",
      },
    },
    {
      // Her order within the album (dragged on the album's page), which the
      // category page follows: a fractional-index key (lib/manual-order.ts).
      // Photos added to an album go to its end (setPhotoOrder above); only a
      // drag changes it after that. Empty for photos in no album.
      name: "albumOrder",
      type: "text",
      index: true,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
        disableBulkEdit: true,
      },
    },
    {
      // Retired: a photo's category is its album's. Nothing reads or writes
      // it; hidden until the column is dropped (docs/launch-checklist.md).
      name: "category",
      type: "relationship",
      relationTo: "categories",
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
        disableBulkEdit: true,
      },
    },
    {
      // Retired: "eligible for the homepage" was never wired up; nothing
      // reads it. Hidden until the column is dropped
      // (docs/launch-checklist.md).
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
        disableBulkEdit: true,
      },
    },
  ],
};
