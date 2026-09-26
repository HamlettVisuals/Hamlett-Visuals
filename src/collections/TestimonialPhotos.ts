import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { RASTER_IMAGE_MIME_TYPES } from "#src/lib/raster-image-types.ts";
import { limitFileSize, removeRefusedUpload } from "#src/lib/upload-limits.ts";
import { PHOTO_MAX_MB } from "#src/lib/upload-sizes.ts";

// Photos a client attaches to a testimonial submission (see
// TestimonialSubmissions.ts). Deliberately a separate upload collection from
// Photos, not a relation into it — same principle as Backstage/Inquiries:
// nothing a visitor submits goes into a public-facing library automatically.
// These stay admin-only (read included) until she reviews a submission and
// explicitly promotes a chosen photo into Photos from /hv-studio (Phase 4).
export const TestimonialPhotos: CollectionConfig = {
  slug: "testimonial-photos",
  labels: {
    singular: "Testimonial Photo",
    plural: "Testimonial Photos",
  },
  admin: {
    hideAPIURL: true,
    useAsTitle: "filename",
    description:
      "Photos clients attach to a testimonial submission — private until you promote one into the Photos library from the submission's review screen.",
    hidden: true,
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: RASTER_IMAGE_MIME_TYPES,
    imageSizes: [
      {
        name: "thumbnail",
        width: 400,
        height: 400,
        fit: "cover",
      },
    ],
  },
  // Size cap on save (upload-limits.ts) for one she adds herself; a client's
  // photo is capped lower before it gets here (testimonial-uploads.ts). A
  // refused file is removed from R2.
  hooks: {
    beforeChange: [limitFileSize({ maxMB: PHOTO_MAX_MB, noun: "photo", plural: "Photos" })],
    afterError: [removeRefusedUpload],
  },
  fields: [
    {
      // The testimonial request (Inquiry) whose link the photo was sent
      // through. Caps how many one link can add, and a submission may only
      // attach its own link's photos (api/testimonial-submissions).
      name: "inquiry",
      type: "relationship",
      relationTo: "inquiries",
      admin: { readOnly: true },
    },
  ],
};
