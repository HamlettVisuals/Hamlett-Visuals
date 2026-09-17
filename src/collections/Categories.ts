import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { formatSlug } from "#src/hooks/formatSlug.ts";

// Mirrors src/content/categories.json (weddings, portraits, pets, brands,
// motorsports, real-estate) — field names match that shape so wiring the
// homepage up to this collection later is a straight swap.
export const Categories: CollectionConfig = {
  slug: "categories",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "order", "published"],
    description:
      "The types of photography you offer (Weddings, Portraits, Pets, etc.) — these show up as the tiles on the homepage and each one gets its own portfolio page.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      admin: {
        description: "The category name, e.g. \"Weddings\".",
      },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description:
          "The web address for this category's portfolio page. Fills in automatically from the name above — you don't need to touch this.",
      },
      hooks: {
        beforeValidate: [formatSlug("name")],
      },
    },
    {
      name: "blurb",
      type: "textarea",
      admin: {
        description:
          "One short line shown under the category name on the homepage.",
      },
    },
    {
      name: "coverPhoto",
      type: "upload",
      relationTo: "photos",
      admin: {
        description: "The photo used for this category's tile on the homepage.",
      },
    },
    {
      name: "heroPhoto",
      type: "upload",
      relationTo: "photos",
      admin: {
        description:
          "The large banner photo shown at the top of this category's own page.",
      },
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: {
        description:
          "Controls the order categories appear in — lower numbers show up first.",
        position: "sidebar",
      },
    },
    {
      name: "published",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Turn off to hide this category from the live site.",
        position: "sidebar",
      },
    },
  ],
};
