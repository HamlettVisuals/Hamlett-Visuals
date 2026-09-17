import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

export const Photos: CollectionConfig = {
  slug: "photos",
  admin: {
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
    mimeTypes: ["image/*"],
    imageSizes: [
      {
        name: "thumbnail",
        width: 400,
        height: 400,
        fit: "cover",
      },
    ],
  },
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
