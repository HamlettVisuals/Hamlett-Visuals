import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  admin: {
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
      name: "category",
      type: "relationship",
      relationTo: "categories",
      admin: {
        description: "Which category this testimonial relates to.",
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
