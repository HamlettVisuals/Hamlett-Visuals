import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { readPosterOfShownVideo } from "#src/access/publicRead.ts";
import { RASTER_IMAGE_MIME_TYPES } from "#src/lib/raster-image-types.ts";
import { limitFileSize, removeRefusedUpload } from "#src/lib/upload-limits.ts";
import { PHOTO_MAX_MB } from "#src/lib/upload-sizes.ts";

// The automatic posters for album videos (collections/Videos.ts,
// `autoPoster`): a frame of the video, made when it's uploaded, shown
// until she picks a poster of her own (`poster`, a photo). Its own upload
// collection, like Backstage Thumbnails, so these frames never show up in
// the Photos library. Not in the studio's side menu
// (components/admin/SiteNav.tsx); only ever reached from a video.
export const VideoPosters: CollectionConfig = {
  slug: "video-posters",
  labels: {
    singular: "Video Poster",
    plural: "Video Posters",
  },
  admin: {
    hideAPIURL: true,
    useAsTitle: "filename",
    description: "Posters made automatically from a frame of each album video.",
  },
  access: {
    // Signed out: only a poster whose video the site shows.
    read: readPosterOfShownVideo,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: RASTER_IMAGE_MIME_TYPES,
    imageSizes: [
      // The album page's video tiles in the studio (components/admin/AlbumVideos).
      { name: "thumbnail", width: 640, height: 360, fit: "cover" },
    ],
  },
  // Size cap on save (upload-limits.ts); a refused file is removed from R2.
  hooks: {
    beforeChange: [limitFileSize({ maxMB: PHOTO_MAX_MB, noun: "poster", plural: "Posters" })],
    afterError: [removeRefusedUpload],
  },
  fields: [
    {
      // The video it was made from, so it goes when the video is deleted
      // for good, or replaced by a new poster when the file is
      // (Videos.ts).
      name: "video",
      type: "relationship",
      relationTo: "videos",
      admin: { readOnly: true },
    },
  ],
};
