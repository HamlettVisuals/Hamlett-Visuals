import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { APIError } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { readVideoInShownAlbum } from "#src/access/publicRead.ts";
import { endOfAlbumOrder } from "#src/lib/album-member-order.ts";
import {
  ALBUM_VIDEO_MAX_MB,
  ALBUM_VIDEO_MAX_SECONDS,
  ALBUM_VIDEO_MIME_TYPE,
  MB,
  refusals,
} from "#src/lib/album-video-limits.ts";
import { bufferSource, inspectVideo, r2Source } from "#src/lib/album-video-media.ts";
import { nestedUploadReq } from "#src/lib/nested-upload-req.ts";
import { UPLOAD_FOLDERS, storedFileKey } from "#src/lib/r2.ts";
import { reorderWithin } from "#src/lib/reorder-within.ts";
import { removeRefusedUpload } from "#src/lib/upload-limits.ts";

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id?: number | string }).id : value;

// Shown as-is in the studio (no colons or commas, see upload-limits.ts).
const refuse = (message: string) => new APIError(message, 400, undefined, true);

// Every uploaded file is read where it is before it's kept (an upload from
// the studio is already in R2 by now; one saved on the server is still in
// memory), without downloading it (lib/album-video-media.ts):
//   - it has to be an MP4 with H.264 video, up to 1GB and 10 minutes, or
//     it's refused with how to export it instead (album-video-limits.ts),
//     and removeRefusedUpload takes it out of R2 again;
//   - its length and its upright size are kept, the size so the site can
//     give the player the video's own shape before it loads;
//   - `fastStart` says whether it can start playing straight away; the
//     studio warns about one that can't, rather than refusing it;
//   - a frame of it becomes its automatic poster (Video Posters), used
//     until she picks one of her own.
const checkVideo: CollectionBeforeChangeHook = async ({ data, req }) => {
  const file = req.file;
  if (!file) return data;
  if (file.size > ALBUM_VIDEO_MAX_MB * MB) throw refuse(refusals.tooBig(file.size));
  if (file.mimetype !== ALBUM_VIDEO_MIME_TYPE) throw refuse(refusals.notMp4(file.name));

  const inStorage = Boolean((file as { clientUploadContext?: unknown }).clientUploadContext);
  const inspection = await (async () => {
    const source = inStorage
      ? await r2Source(storedFileKey(data.prefix ?? UPLOAD_FOLDERS.videos, file.name))
      : bufferSource(file.data);
    return inspectVideo(source, { withFrame: true });
  })().catch((err) => {
    req.payload.logger.error({ err }, "[videos] couldn't read an uploaded video");
    throw refuse("The video couldn't be checked just now. Try uploading it again in a minute.");
  });

  const { layout, probe, frame } = inspection;
  if (!layout || !probe.codec) throw refuse(refusals.unreadable());
  if (layout.brand === "qt  ") throw refuse(refusals.quickTime());
  if (probe.codec !== "h264") throw refuse(refusals.wrongCodec(probe.codec));
  if (probe.duration !== null && probe.duration > ALBUM_VIDEO_MAX_SECONDS) throw refuse(refusals.tooLong(probe.duration));

  data.duration = probe.duration;
  data.width = probe.width;
  data.height = probe.height;
  data.fastStart = layout.fastStart !== false;
  data.autoPoster = frame ? await makeAutoPoster(req, frame, file.name) : null;
  return data;
};

async function makeAutoPoster(req: PayloadRequest, frame: Buffer, videoName: string) {
  const base = videoName.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").toLowerCase() || "video";
  const poster = await req.payload
    .create({
      collection: "video-posters",
      data: {},
      file: { data: frame, mimetype: "image/jpeg", name: `${base}-poster.jpg`, size: frame.length },
      depth: 0,
      overrideAccess: true,
      req: nestedUploadReq(req),
    })
    .catch((err) => {
      req.payload.logger.warn({ err }, "[videos] couldn't save the automatic poster");
      return null;
    });
  return poster?.id ?? null;
}

// Ties the automatic poster to its video (Video Posters' `video`), and
// deletes the one a new file replaced.
const settleAutoPoster: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const current = idOf(doc.autoPoster) as number | undefined;
  const replaced = idOf(previousDoc?.autoPoster) as number | undefined;
  if (current && current !== replaced) {
    await req.payload.update({
      collection: "video-posters",
      id: current,
      data: { video: doc.id },
      depth: 0,
      overrideAccess: true,
      req: nestedUploadReq(req),
    });
  }
  if (replaced && replaced !== current) {
    await req.payload
      .delete({ collection: "video-posters", id: replaced, overrideAccess: true, req: nestedUploadReq(req) })
      .catch((err) => req.payload.logger.warn({ err }, "[videos] couldn't remove the replaced poster"));
  }
  return doc;
};

// Deleting a video for good (emptying it from the Trash, or deleting its
// album for good) also deletes its automatic posters and their files.
// Before the delete: the database clears `video` on them as it goes.
const removeAutoPosters: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: "video-posters",
    where: { video: { equals: id } },
    overrideAccess: true,
    req: nestedUploadReq(req),
  });
};

// A walkthrough or highlight reel for one shoot: an MP4 in one album
// (`event`), shown above the album's photos on its category page as a
// large player, in her order. Added, reordered and edited from the album's
// page in the studio (components/admin/AlbumVideos). Like every upload it
// goes from the browser straight to R2, and it plays straight from R2: the
// "videos" entry in payload.config.ts's s3Storage answers its file URL
// with a short-lived signed link.
//
// No `mimeTypes` list, on purpose: with one, Payload downloads the whole
// file to the server on save to check its type, and a 1GB video doesn't
// fit in a Vercel function's /tmp. checkVideo above checks it in place
// instead.
export const Videos: CollectionConfig = {
  slug: "videos",
  labels: {
    singular: "Video",
    plural: "Videos",
  },
  // Deletes go to this collection's Trash first, restorable from there.
  trash: true,
  admin: {
    hideAPIURL: true,
    useAsTitle: "title",
    defaultColumns: ["filename", "title", "event"],
    description: "Walkthroughs and highlight reels, each shown at the top of its album. Add them from the album's page.",
  },
  access: {
    // Signed out (the site's visitors, and the video player's requests for
    // the file): only videos in an album the site shows.
    read: readVideoInShownAlbum,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    pasteURL: false,
  },
  hooks: {
    // Her order in the album: new videos go to its end (lib/album-member-order.ts).
    beforeChange: [endOfAlbumOrder("videos"), checkVideo],
    afterChange: [settleAutoPoster],
    beforeDelete: [removeAutoPosters],
    afterError: [removeRefusedUpload],
  },
  endpoints: [
    {
      // A drag in the album page's Videos list:
      // POST /api/videos/reorder-videos { album, order: [ids], moved: id }.
      // See lib/reorder-within.ts.
      path: "/reorder-videos",
      method: "post",
      handler: async (req) => {
        const body = (await req.json?.().catch(() => null)) as { album?: unknown; order?: unknown; moved?: unknown } | null;
        const isId = (value: unknown): value is number => Number.isInteger(value);
        if (!body || !isId(body.album) || !isId(body.moved) || !Array.isArray(body.order) || !body.order.every(isId)) {
          return Response.json({ error: "Invalid reorder." }, { status: 400 });
        }
        return reorderWithin({
          req,
          target: { collection: "videos", field: "albumOrder", scope: { field: "event", id: body.album } },
          order: body.order,
          moved: body.moved,
        });
      },
    },
  ],
  fields: [
    {
      name: "title",
      type: "text",
      maxLength: 80,
      admin: {
        description: "Optional. Shown above the video, e.g. \"Highlight reel\".",
      },
    },
    {
      name: "event",
      type: "relationship",
      relationTo: "events",
      required: true,
      index: true,
      label: "Album",
    },
    {
      // Her choice of poster: a photo, from the album or uploaded for it.
      // Left empty, the site shows `autoPoster`.
      name: "poster",
      type: "upload",
      relationTo: "photos",
    },
    {
      // A frame of the video (checkVideo), made when the file is uploaded.
      name: "autoPoster",
      type: "upload",
      relationTo: "video-posters",
      admin: { readOnly: true },
    },
    {
      // Seconds, read from the file on upload.
      name: "duration",
      type: "number",
      admin: { readOnly: true },
    },
    {
      // False when the file's index comes after its video data, so a
      // browser has to fetch the end of the file before it can play.
      name: "fastStart",
      type: "checkbox",
      defaultValue: true,
      admin: { readOnly: true },
    },
    {
      // Her order within the album (dragged on the album's page): a
      // fractional-index key (lib/manual-order.ts). Videos added to an
      // album go to its end; only a drag changes it after that.
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
  ],
};
