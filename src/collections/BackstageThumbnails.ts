import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { RASTER_IMAGE_MIME_TYPES } from "#src/lib/raster-image-types.ts";
import { limitFileSize, removeRefusedUpload } from "#src/lib/upload-limits.ts";
import { PHOTO_MAX_MB } from "#src/lib/upload-sizes.ts";

// The grid images for Backstage videos (collections/Backstage.ts, `poster`).
// Most are made automatically from a frame of the video when it's uploaded
// (`generated`); she can upload her own from the item's editor instead.
// A photo item needs none: the photo is its own thumbnail. Its own upload
// collection, like Logos, so these frames never show up in the Photos
// library. Not in the studio's side menu (components/admin/SiteNav.tsx);
// they're only ever reached from a Backstage item.
export const BackstageThumbnails: CollectionConfig = {
  slug: "backstage-thumbnails",
  labels: {
    singular: "Backstage Thumbnail",
    plural: "Backstage Thumbnails",
  },
  admin: {
    hideAPIURL: true,
    useAsTitle: "filename",
    description:
      "Thumbnails for your Backstage videos. Most are made automatically from the video; you can upload your own from a video's editor.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: RASTER_IMAGE_MIME_TYPES,
    imageSizes: [
      // The studio list's small square (components/admin/BackstageCells.tsx).
      { name: "thumbnail", width: 400, height: 400, fit: "cover" },
    ],
  },
  // Size cap on save (upload-limits.ts); a refused file is removed from R2.
  hooks: {
    beforeChange: [limitFileSize({ maxMB: PHOTO_MAX_MB, noun: "thumbnail", plural: "Thumbnails" })],
    afterError: [removeRefusedUpload],
  },
  fields: [
    {
      // Made from a frame of the video rather than uploaded by her. Only
      // these are replaced when the video is swapped for another.
      name: "generated",
      type: "checkbox",
      defaultValue: false,
      admin: { readOnly: true, description: "Made automatically from the video." },
    },
    {
      // The Backstage item it belongs to, so its thumbnails go when the
      // item is deleted for good (Backstage.ts, removeThumbnails).
      name: "item",
      type: "relationship",
      relationTo: "backstage",
      admin: { readOnly: true },
    },
  ],
};
