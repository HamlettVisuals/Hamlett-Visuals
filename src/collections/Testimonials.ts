import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  admin: {
    hideAPIURL: true,
    useAsTitle: "clientName",
    defaultColumns: ["clientName", "category", "featured", "published"],
    description:
      "Client quotes and reviews, shown on the Testimonials page and (for the ones you feature) on the homepage.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  fields: [
    {
      name: "quote",
      type: "textarea",
      required: true,
      admin: {
        description: "The client's quote, word for word.",
      },
    },
    {
      name: "clientName",
      type: "text",
      required: true,
      admin: {
        description: "Who said it, e.g. \"Priya & Daniel\".",
      },
    },
    {
      // Required: /testimonials (src/app/(site)/testimonials/page.tsx) groups
      // testimonials by category and silently drops any without one — a
      // testimonial saved without a category would still show up featured on
      // the homepage teaser, but never appear on the full testimonials page.
      // Making this required surfaces that at save time instead.
      name: "category",
      type: "relationship",
      relationTo: "categories",
      required: true,
      admin: {
        description:
          "Which category this testimonial relates to. Required — testimonials without one won't appear on the Testimonials page.",
      },
    },
    {
      name: "event",
      type: "relationship",
      relationTo: "events",
      admin: {
        description:
          "Which shoot this testimonial is about, if you'd like to link to it.",
      },
    },
    {
      name: "photo",
      type: "upload",
      relationTo: "photos",
      admin: {
        description: "An optional photo shown alongside this testimonial.",
      },
    },
    {
      name: "context",
      type: "text",
      admin: {
        description: 'An optional short line, e.g. "Wedding, June 2025".',
      },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Check this to show this testimonial on the homepage (pick exactly two).",
        position: "sidebar",
      },
    },
    {
      name: "published",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Turn off to hide this testimonial from the live site.",
        position: "sidebar",
      },
    },
  ],
};
