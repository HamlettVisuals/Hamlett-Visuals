import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { limitFileSize, removeRefusedUpload } from "#src/lib/upload-limits.ts";
import { LOGO_MAX_MB } from "#src/lib/upload-sizes.ts";

// Backs Site Settings' `logo` upload field (see globals/SiteSettings.ts and
// components/Wordmark.tsx). Its own upload collection rather than Photos
// for two reasons:
//   - Photos requires hand-written alt text on every upload; a logo's alt
//     is always the studio name, so Wordmark derives it from siteName and
//     this collection has no alt field to fill in.
//   - It keeps the logo out of the photo library that every other picker
//     (Hero, About, Category covers, ...) browses.
// Stored in R2, in its own folder, like every upload (payload.config.ts).
//
// PNG/WebP only — deliberately no SVG. SVGs can carry scripts, and Payload's
// own SVG check is a pattern denylist rather than a real sanitizer; a raster
// logo can't execute anything.
export const Logos: CollectionConfig = {
  slug: "logos",
  labels: { singular: "Logo", plural: "Logos" },
  admin: {
    hideAPIURL: true,
    useAsTitle: "filename",
    description:
      "Logo files uploaded from Site Settings. Only the one picked there is shown on the site.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: ["image/png", "image/webp"],
    imageSizes: [
      // What the header/footer actually load: 160px tall covers the
      // largest display height (footer, 56px) at ~3x density without
      // shipping a multi-megabyte original. Width follows the aspect ratio;
      // smaller originals are left as-is (sharp's withoutEnlargement).
      {
        name: "display",
        height: 160,
        withoutEnlargement: true,
      },
    ],
  },
  // Size cap on save (upload-limits.ts); a refused file is removed from R2.
  hooks: {
    beforeChange: [limitFileSize({ maxMB: LOGO_MAX_MB, noun: "logo", plural: "Logos" })],
    afterError: [removeRefusedUpload],
  },
  fields: [],
};
