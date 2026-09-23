import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

// Reusable checklist item lists for both Prep and Post-Production, applied to
// Inquiries (see prepChecklist/postProductionChecklist on Inquiries.ts) once
// UI for that lands in a later chunk. A template with `category` unset is the
// Standard template for its type — the fallback used when a category doesn't
// have its own. Categories.ts's afterChange hook auto-creates a blank pair of
// these (one per type) whenever a new category is created.
export const ChecklistTemplates: CollectionConfig = {
  slug: "checklist-templates",
  admin: {
    hideAPIURL: true,
    useAsTitle: "name",
    defaultColumns: ["name", "type", "category"],
    description: "Item lists reused across Prep and Post-Production checklists — one Standard template per type, plus optional per-category overrides.",
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      admin: {
        description: "Internal label shown in the admin list — not shown to clients.",
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      options: [
        { label: "Prep", value: "prep" },
        { label: "Post-Production", value: "postProduction" },
      ],
      admin: {
        description: "Which checklist this template fills.",
      },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      hasMany: false,
      admin: {
        description: "Leave unset for the Standard template used by categories without their own.",
      },
    },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "text", type: "text", required: true },
      ],
    },
  ],
  timestamps: true,
};
