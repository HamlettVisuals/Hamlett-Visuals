import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { RASTER_IMAGE_MIME_TYPES } from "#src/lib/raster-image-types.ts";
import { CLOSE_EDITOR_BUTTON } from "#src/lib/admin-components.ts";
import { removeRefusedUpload } from "#src/lib/upload-limits.ts";
import { resizeLargePhotos } from "#src/lib/photo-resize.ts";
import { PHOTO_MAX_MB } from "#src/lib/upload-sizes.ts";

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
    useAsTitle: "alt",
    defaultColumns: ["filename", "alt", "event", "category"],
    description:
      "Every photo you upload — the library that events, testimonials, and the homepage draw from.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: RASTER_IMAGE_MIME_TYPES,
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
  },
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  fields: [
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
      name: "category",
      type: "relationship",
      relationTo: "categories",
      admin: {
        description:
          "Only set this if the photo isn't part of a specific shoot above — for example, a category's cover photo.",
      },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Check this to make the photo eligible for use on the homepage.",
        position: "sidebar",
      },
    },
  ],
};
