import type { CollectionAfterChangeHook, CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { formatSlug } from "#src/hooks/formatSlug.ts";

// Gives every new category its own blank Prep and Post-Production checklist
// templates to customize, rather than leaving it to fall back to the
// Standard template (see ChecklistTemplates.ts) with no way to tell them
// apart in the admin list. Create-only: renaming a category later doesn't
// rename its templates, since she may have already retitled them herself.
const createBlankChecklistTemplates: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;

  await req.payload.create({
    collection: "checklist-templates",
    data: { name: `${doc.name} — Prep`, type: "prep", category: doc.id, items: [] },
    req,
  });

  await req.payload.create({
    collection: "checklist-templates",
    data: { name: `${doc.name} — Post-Production`, type: "postProduction", category: doc.id, items: [] },
    req,
  });

  return doc;
};

// The types of photography offered — every page that used to read from the
// old static src/content/categories.json placeholder (now removed) reads
// from this collection instead: the homepage grid, the booking form's
// session-type list, and each /portfolio/[category] page.
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
  hooks: {
    afterChange: [createBlankChecklistTemplates],
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
