import type { CollectionConfig } from "payload";
import { ValidationError } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

// The /backstage feed: uploaded video clips and links to existing Instagram
// Reels, in one manually-ordered list. This collection is itself
// upload-enabled (mimeTypes: video/*) rather than reusing the Photos
// collection — see the video-upload investigation this was scoped from:
// Photos' relation is used everywhere (About portrait, Category covers,
// Testimonials), so keeping it image-only preserves that invariant, and
// video needs its own upload settings (clientUploads + signedDownloads,
// see the "backstage" entry in payload.config.ts's s3Storage plugin) that
// Photos doesn't need. `filesRequiredOnCreate: false` because a
// "reel_embed" item has no uploaded file at all.
export const Backstage: CollectionConfig = {
  slug: "backstage",
  labels: {
    singular: "Backstage Item",
    plural: "Backstage",
  },
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  admin: {
    hideAPIURL: true,
    useAsTitle: "title",
    defaultColumns: ["title", "type", "order", "published"],
    description:
      "The behind-the-scenes feed on /backstage — uploaded video clips and linked Instagram Reels.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: ["video/*"],
    filesRequiredOnCreate: false,
  },
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      admin: {
        description: "A short label for this item, shown on the grid tile.",
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "video",
      options: [
        { label: "Uploaded video", value: "video" },
        { label: "Instagram Reel", value: "reel_embed" },
      ],
      admin: {
        description:
          "An uploaded video file, or a link to a Reel that's already on Instagram.",
      },
    },
    {
      // Payload's `admin.condition` only controls visibility — it does not
      // make a field required/optional on its own, so the "required when
      // type is reel_embed" rule below is enforced by `validate`, not by a
      // plain `required: true` (which would demand this on video items too).
      name: "reelUrl",
      type: "text",
      admin: {
        condition: (data) => data?.type === "reel_embed",
        description:
          "The Reel's Instagram permalink, e.g. https://www.instagram.com/reel/abc123/",
      },
      validate: (value: string | null | undefined, { siblingData }: { siblingData: { type?: string } }) => {
        if (siblingData?.type === "reel_embed" && !value) {
          return "An Instagram permalink is required for a Reel embed.";
        }
        return true;
      },
    },
    {
      name: "thumbnail",
      type: "upload",
      relationTo: "photos",
      required: true,
      admin: {
        description:
          "The grid tile image — a poster frame for a video, or a preview image for a Reel. Needed either way.",
      },
    },
    {
      name: "caption",
      type: "text",
      admin: {
        description: "An optional caption shown when this item is opened.",
      },
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: {
        description:
          "Controls where this item falls in the feed — lower numbers show up first.",
        position: "sidebar",
      },
    },
    {
      name: "published",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Turn off to hide this item from the live site.",
        position: "sidebar",
      },
    },
  ],
  hooks: {
    // Same reasoning as reelUrl's `validate` above, but for the file itself:
    // the upload dropzone can't be conditionally hidden via admin.condition
    // (it isn't a `fields` entry — Payload renders it as a fixed part of the
    // upload-collection edit view), so instead of hiding it, this enforces
    // "a file is required when type is video" server-side once the type is
    // known, after generateFileData has populated `data.filename` for any
    // incoming upload.
    beforeValidate: [
      ({ data, originalDoc }) => {
        const type = data?.type ?? originalDoc?.type;
        const hasFile = Boolean(data?.filename ?? originalDoc?.filename);
        if (type === "video" && !hasFile) {
          throw new ValidationError({
            collection: "backstage",
            errors: [
              {
                path: "file",
                message: "A video file is required when Type is set to Uploaded video.",
              },
            ],
          });
        }
        return data;
      },
    ],
  },
};
