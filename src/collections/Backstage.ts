import type {
  CollectionAfterChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { APIError, isolateObjectProperty } from "payload";
import { generateKeyBetween } from "payload/shared";
import { isAdmin } from "#src/access/isAdmin.ts";
import { CLOSE_EDITOR_BUTTON } from "#src/lib/admin-components.ts";
import {
  CAPTION_MAX,
  MB,
  PHOTO_MAX_MB,
  TITLE_MAX,
  VIDEO_MAX_MB,
  VIDEO_MAX_SECONDS,
  VIDEO_MIME_TYPES,
  isVideoMimeType,
  titleFromFilename,
} from "#src/lib/backstage-limits.ts";
import {
  downloadToTemp,
  extractFrame,
  incomingFileOnDisk,
  probeDuration,
  removeTemp,
} from "#src/lib/backstage-media.ts";
import { RASTER_IMAGE_MIME_TYPES } from "#src/lib/raster-image-types.ts";
import { UPLOAD_FOLDERS, storedFileKey } from "#src/lib/r2.ts";
import { removeRefusedUpload } from "#src/lib/upload-limits.ts";
import { resizeLargePhotos } from "#src/lib/photo-resize.ts";
import { formatMB } from "#src/lib/upload-sizes.ts";
import { serverURL } from "#src/lib/server-url.ts";

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id?: number | string }).id : value;

// An APIError rather than a ValidationError: there's no field to hang a
// "file" error on, so Payload would only say "The following field is
// invalid: file". This message is shown as-is, in the editor and in
// "Upload several". No colons or commas in it: Payload's error toast reads
// "message: a, b" as a list of fields.
const refuse = (message: string) => new APIError(message, 400, undefined, true);

// A blank title (always the case in "Upload several") comes from the file
// name, e.g. "wedding-prep_02.mp4" -> "Wedding prep 02". A save that
// doesn't send a title at all (the list's Live/Hidden pill) keeps the
// current one.
const defaultTitle: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data;
  if (data.title === undefined && originalDoc?.title) return data;
  if (typeof data.title === "string" && data.title.trim()) {
    data.title = data.title.trim();
    return data;
  }
  const filename = data.filename ?? originalDoc?.filename;
  if (typeof filename === "string" && filename) data.title = titleFromFilename(filename);
  return data;
};

// New items go to the top of the feed. `orderable` would put them last; its
// own hook runs after this one and leaves a key that's already set alone.
const newItemsFirst: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create" || data._order) return data;
  const { docs } = await req.payload.find({
    collection: "backstage",
    where: { _order: { exists: true } },
    sort: "_order",
    limit: 1,
    depth: 0,
    pagination: false,
    trash: true,
    select: { _order: true } as never,
    req,
  });
  data._order = generateKeyBetween(null, (docs[0] as { _order?: string } | undefined)?._order ?? null);
  return data;
};

// As for Categories and Packages: only the list's drag-to-reorder moves an
// item. A History restore, Undo or the REST API keeps its current place.
const keepOrder: CollectionBeforeChangeHook = ({ context, data, operation, originalDoc, req }) => {
  if (operation !== "update" || !originalDoc?._order) return data;
  const isReorder = context.allowOrderChange === true || Boolean(req.pathname?.endsWith("/reorder"));
  if (!isReorder) data._order = originalDoc._order;
  return data;
};

// A History restore brings back the title, caption and show/hide, but keeps
// the current file and thumbnail. Payload deletes a replaced file from
// storage, so an earlier version's file is usually gone and restoring it
// would leave a broken video; its automatic thumbnail may be gone too
// (removeReplacedThumbnail). Only uploading a file changes the file, and
// no other save without an upload may point the item at a different one.
const FILE_FIELDS = ["prefix", "filename", "mimeType", "filesize", "width", "height", "focalX", "focalY", "url", "thumbnailURL", "sizes"];
const keepFile: CollectionBeforeChangeHook = ({ context, data, operation, originalDoc, req }) => {
  if (operation !== "update" || req.file || !originalDoc?.filename) return data;
  const restoring = context.isRestoringVersion === true;
  if (!restoring && (data.filename === undefined || data.filename === originalDoc.filename)) return data;
  for (const field of FILE_FIELDS) data[field] = originalDoc[field] ?? null;
  data.poster = idOf(originalDoc.poster) ?? null;
  return data;
};

// The request for a save on Backstage Thumbnails made from inside this
// item's save: same transaction, but its own file and context. Payload's
// Local API puts the thumbnail's file on `req.file`, and the storage plugin
// remembers "this request's file" in `req.context` the first time it sees
// one, so on the shared request the video's upload would be stored with the
// thumbnail's bytes.
function thumbnailReq(req: PayloadRequest): PayloadRequest {
  const isolated = isolateObjectProperty(req, ["file", "payloadUploadSizes", "context"]);
  isolated.file = undefined;
  isolated.payloadUploadSizes = undefined;
  isolated.context = {};
  return isolated;
}

// Creates a Backstage Thumbnail from a frame of the video.
async function makeThumbnail(req: PayloadRequest, videoPath: string, duration: number | null, title: string) {
  const frame = await extractFrame(videoPath, duration);
  if (!frame) return null;
  const thumbnail = await req.payload.create({
    collection: "backstage-thumbnails",
    data: { generated: true },
    file: {
      data: frame,
      mimetype: "image/jpeg",
      name: `${titleFromFilename(title).replace(/\s+/g, "-").toLowerCase() || "video"}-thumbnail.jpg`,
      size: frame.length,
    },
    depth: 0,
    overrideAccess: true,
    req: thumbnailReq(req),
  });
  return thumbnail.id;
}

async function isGeneratedThumbnail(req: PayloadRequest, id: unknown) {
  if (!id) return false;
  const doc = await req.payload
    .findByID({ collection: "backstage-thumbnails", id: id as number, depth: 0, disableErrors: true, req })
    .catch(() => null);
  return Boolean(doc?.generated);
}

// Every item is one uploaded file, a photo or a video:
//   - Size is checked for both, and a video's length, before anything is
//     kept. A file sent straight from the browser is already in storage by
//     now; a refused one is removed again (removeRefusedUpload).
//   - A photo is its own thumbnail, so `poster` is cleared.
//   - A video gets a frame of itself as its thumbnail when it's uploaded, or
//     when she removes her own thumbnail. A new video replaces a thumbnail
//     that was made automatically, but never one she chose, and the
//     replaced automatic one is deleted.
const handleMedia: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const file = req.file;
  const mimeType = data.mimeType ?? originalDoc?.mimeType;
  const filename = data.filename ?? originalDoc?.filename;

  if (!isVideoMimeType(mimeType)) {
    if (file && file.size > PHOTO_MAX_MB * MB) {
      throw refuse(`That photo is ${formatMB(file.size, PHOTO_MAX_MB)}. Photos can be up to ${PHOTO_MAX_MB}MB.`);
    }
    data.poster = null;
    return data;
  }

  if (file && file.size > VIDEO_MAX_MB * MB) {
    throw refuse(`That video is ${formatMB(file.size, VIDEO_MAX_MB)}. Videos can be up to ${VIDEO_MAX_MB}MB; under 100MB works best.`);
  }

  const posterId = idOf(data.poster !== undefined ? data.poster : originalDoc?.poster);
  const needsThumbnail = file ? !posterId || (await isGeneratedThumbnail(req, posterId)) : !posterId;
  if (!file && !needsThumbnail) return data;

  let videoPath: string | null = null;
  let cleanup = async () => {};
  try {
    if (file) {
      const onDisk = await incomingFileOnDisk(file);
      videoPath = onDisk.path;
      cleanup = onDisk.cleanup;
    } else if (filename) {
      const prefix = data.prefix ?? originalDoc?.prefix ?? UPLOAD_FOLDERS.backstage;
      const downloaded = await downloadToTemp(storedFileKey(prefix, filename)).catch((err) => {
        req.payload.logger.warn({ err }, "[backstage] couldn't fetch the video to make a thumbnail");
        return null;
      });
      if (downloaded) {
        videoPath = downloaded;
        cleanup = () => removeTemp(downloaded);
      }
    }
    if (!videoPath) return data;

    // If ffmpeg is missing or can't read the file, the item still saves:
    // without the length check, and with a plain tile until she adds a
    // thumbnail of her own.
    const duration = await probeDuration(videoPath).catch((err) => {
      req.payload.logger.warn({ err }, "[backstage] couldn't read the video's length");
      return null;
    });
    if (file && duration !== null && duration > VIDEO_MAX_SECONDS) {
      const total = Math.round(duration);
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      throw refuse(
        `That video is ${minutes} min${seconds ? ` ${seconds} sec` : ""} long. Videos can be up to ${VIDEO_MAX_SECONDS / 60} minutes.`,
      );
    }

    if (needsThumbnail) {
      const title = data.title ?? originalDoc?.title ?? filename ?? "video";
      const thumbnailId = await makeThumbnail(req, videoPath, duration, String(title)).catch((err) => {
        req.payload.logger.warn({ err }, "[backstage] couldn't make a thumbnail from the video");
        return null;
      });
      data.poster = thumbnailId ?? null;
    }
  } finally {
    await cleanup();
  }
  return data;
};

// Ties the item's thumbnail to it (Backstage Thumbnails' `item`), so it's
// removed with the item.
const claimThumbnail: CollectionAfterChangeHook = async ({ doc, req }) => {
  const posterId = idOf(doc.poster);
  if (!posterId) return doc;
  const thumbnail = await req.payload
    .findByID({ collection: "backstage-thumbnails", id: posterId as number, depth: 0, disableErrors: true, req })
    .catch(() => null);
  if (thumbnail && !idOf(thumbnail.item)) {
    await req.payload.update({
      collection: "backstage-thumbnails",
      id: thumbnail.id,
      data: { item: doc.id },
      depth: 0,
      overrideAccess: true,
      req: thumbnailReq(req),
    });
  }
  return doc;
};

// A new file replaces the old video's automatic thumbnail (handleMedia);
// this deletes the replaced one, with its files. Only ever an automatic
// one: a thumbnail she uploaded is kept until the item is deleted for good.
const removeReplacedThumbnail: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const replaced = idOf(previousDoc?.poster);
  if (!replaced || replaced === idOf(doc.poster) || doc.filename === previousDoc?.filename) return doc;
  if (!(await isGeneratedThumbnail(req, replaced))) return doc;
  await req.payload
    .delete({ collection: "backstage-thumbnails", id: replaced as number, overrideAccess: true, req: thumbnailReq(req) })
    .catch((err) => req.payload.logger.warn({ err }, "[backstage] couldn't remove the replaced thumbnail"));
  return doc;
};

// Deleting an item for good (emptying it from the Trash) also deletes its
// thumbnails and their files. Moving it to the Trash keeps them. Before the
// delete, not after: the database clears `item` on its thumbnails as the
// item goes, so afterwards they can't be found.
const removeThumbnails: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: "backstage-thumbnails",
    where: { item: { equals: id } },
    overrideAccess: true,
    req: thumbnailReq(req),
  });
};

// The /backstage feed: uploaded photos and video clips, one file per item,
// in the order she drags them into (newest at the top). Its own upload
// collection rather than Photos: Photos' relation is used everywhere (About
// portrait, Category covers, Testimonials) and stays image-only, and video
// needs its own settings: its own size and length checks here, and signed
// downloads (the "backstage" entry in payload.config.ts's s3Storage) so a
// clip plays straight from R2. Like every upload, it goes from the browser
// straight to R2.
export const Backstage: CollectionConfig = {
  slug: "backstage",
  labels: {
    singular: "Item",
    plural: "Backstage",
  },
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  // Drag-to-reorder in the list view, like Categories and Packages. The old
  // numeric `order` field is kept below, hidden, so its column isn't
  // dropped; there were no items to carry over when this changed.
  orderable: true,
  admin: {
    components: {
      // The list description with "+ Add item" and "Upload several"
      // (Payload's own "Create New" and "Bulk Upload" are hidden in
      // admin-overrides.css), and the empty state.
      Description: "/components/admin/BackstageCells#BackstageListDescription",
      beforeListTable: ["/components/admin/BackstageCells#BackstageEmptyState"],
      edit: {
        // Undo / Redo / Discard next to Save — see components/admin/EditHistory.tsx.
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
          // "New item" instead of "[Untitled]" before the first save.
          "/components/admin/NewDocumentTitle#default",
        ],
      },
      // ✕ back to this list, in the top bar of the Edit and History tabs.
      // See components/admin/CloseEditorButton.tsx.
      views: {
        edit: {
          default: { actions: [CLOSE_EDITOR_BUTTON] },
          versions: { actions: [CLOSE_EDITOR_BUTTON] },
          version: { actions: [CLOSE_EDITOR_BUTTON] },
        },
      },
    },
    hideAPIURL: true,
    useAsTitle: "title",
    defaultColumns: ["preview", "title", "published"],
    // All on one page so any row can be dragged anywhere; src/proxy.ts
    // forces limit=100 and the drag sort, as for Categories and Packages.
    pagination: { defaultLimit: 100, limits: [100] },
    // Item-scoped Live Preview (docs/collection-live-preview.md): /backstage
    // scrolled to this item's tile, with `lpDoc` telling that tile
    // (components/Backstage/BackstageGrid.tsx) to follow the unsaved title,
    // caption and thumbnail. Falls back to the feed when the tile isn't on
    // the page (hidden, or not saved yet). Show/hide, order and a new file
    // only change after saving.
    livePreview: {
      url: ({ data }) => {
        const id = data?.id;
        if (!id) return `${serverURL}/backstage#live-preview:backstage-feed`;
        return `${serverURL}/backstage?lpDoc=${encodeURIComponent(String(id))}#live-preview:backstage-${id},backstage-feed`;
      },
    },
    description:
      "The photos and video clips on your Backstage page. Drag to set their order; new ones go to the top.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: [...RASTER_IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
    // Photos get a small square for the studio list; videos are left as they
    // are (see handleMedia for their thumbnail).
    imageSizes: [{ name: "thumbnail", width: 400, height: 400, fit: "cover" }],
    // Uploads only: no fetching a file from a pasted link.
    pasteURL: false,
    admin: {
      components: {
        // "Videos under 100MB work best. Export at 1080p." in the dropzone.
        controls: ["/components/admin/BackstageCells#BackstageUploadHint"],
      },
    },
  },
  hooks: {
    // Photo items: size cap, then shrinks one over 3000px and removes GPS
    // data (videos are left to handleMedia).
    beforeOperation: [resizeLargePhotos({ maxMB: PHOTO_MAX_MB, noun: "photo", plural: "Photos" })],
    beforeValidate: [defaultTitle],
    beforeChange: [newItemsFirst, keepOrder, keepFile, handleMedia],
    afterChange: [claimThumbnail, removeReplacedThumbnail],
    beforeDelete: [removeThumbnails],
    afterError: [removeRefusedUpload],
  },
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  fields: [
    {
      // List column only: the thumbnail with a video or photo mark. Not
      // stored.
      name: "preview",
      type: "ui",
      label: "Item",
      admin: {
        components: {
          Field: "/components/admin/AlbumCells#EmptyField",
          Cell: "/components/admin/BackstageThumbnailCell#default",
        },
      },
    },
    {
      name: "title",
      type: "text",
      maxLength: TITLE_MAX,
      admin: {
        description: `Optional. Shown under the tile and in the viewer. Left blank, it comes from the file name. Up to ${TITLE_MAX} characters.`,
      },
    },
    {
      // Directly under Title in the main column, same as Categories, Albums
      // and Packages: the sidebar drops below the form whenever Live
      // Preview is open, so the switch would move with the preview toggle.
      name: "published",
      type: "checkbox",
      defaultValue: true,
      label: "Show on website",
      admin: {
        description: "Turn off to hide this item from your Backstage page.",
        components: {
          Field: "/components/admin/ShowOnWebsiteField#default",
          Cell: "/components/admin/CategoryCells#CategoryStatusCell",
        },
      },
    },
    {
      name: "caption",
      type: "textarea",
      maxLength: CAPTION_MAX,
      admin: {
        description: `Optional. Two lines show under the tile; all of it shows in the viewer. Up to ${CAPTION_MAX} characters.`,
      },
    },
    {
      // A video's grid image. Made from a frame of the video when it's
      // uploaded (handleMedia); she can pick her own. Photos don't have one.
      name: "poster",
      type: "upload",
      relationTo: "backstage-thumbnails",
      label: "Thumbnail",
      admin: {
        condition: (data) => isVideoMimeType(data?.mimeType),
        description:
          "Made automatically from a frame of the video. To use your own image, remove this and upload one; remove yours to go back to the automatic one.",
      },
    },
    {
      // Retired: every item is an uploaded file now (the Instagram Reel link
      // option is gone), and photo vs video comes from the file itself.
      // Hidden and unread, kept so the column isn't dropped.
      name: "type",
      type: "select",
      required: true,
      defaultValue: "video",
      options: [
        { label: "Uploaded video", value: "video" },
        { label: "Instagram Reel", value: "reel_embed" },
      ],
      admin: { hidden: true, disableListColumn: true, disableListFilter: true },
    },
    {
      // Retired with the Reel link option. Hidden and unread.
      name: "reelUrl",
      type: "text",
      admin: { hidden: true, disableListColumn: true, disableListFilter: true },
    },
    {
      // Retired: replaced by `poster` above (a frame of the video, kept out
      // of the Photos library). Hidden and unread.
      name: "thumbnail",
      type: "upload",
      relationTo: "photos",
      admin: { hidden: true, disableListColumn: true, disableListFilter: true },
    },
    {
      // Superseded by drag-to-reorder (`_order`, see `orderable` above).
      // Hidden and unread.
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: { hidden: true, disableListColumn: true, disableListFilter: true },
    },
  ],
};
