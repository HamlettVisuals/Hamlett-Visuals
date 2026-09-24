import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { RASTER_IMAGE_MIME_TYPES } from "#src/lib/raster-image-types.ts";

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
  fields: [],
};
