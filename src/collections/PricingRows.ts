import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

// Mirrors the `Offer` shape in src/lib/site-content.ts — one row per
// category, rendered by the Offers & pricing section and (for the row
// flagged `featured`) the standalone Hot offer block.
export const PricingRows: CollectionConfig = {
  slug: "pricing-rows",
  labels: {
    singular: "Pricing / Offer Row",
    plural: "Pricing / Offer Rows",
  },
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  admin: {
    // Undo / Redo / Discard next to Save — see components/admin/EditHistory.tsx.
    components: {
      edit: {
        beforeDocumentControls: ["/components/admin/EditHistory#default"],
      },
    },
    hideAPIURL: true,
    useAsTitle: "title",
    defaultColumns: ["title", "category", "priceAmount", "featured"],
    description:
      "Your packages and pricing, shown in the Offers & Pricing section. Check 'featured' on one row to also spotlight it in the 'Popular right now' section.",
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
      name: "title",
      type: "text",
      required: true,
      admin: {
        description: "The package name, e.g. \"Wedding Day Coverage\".",
      },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      required: true,
      hasMany: false,
      admin: {
        description: "Which category this package belongs to.",
      },
    },
    {
      name: "priceLead",
      type: "text",
      defaultValue: "From",
      admin: {
        description: 'The small word above the price, e.g. "From".',
        width: "50%",
      },
    },
    {
      name: "priceAmount",
      type: "text",
      required: true,
      admin: {
        description: 'The price itself, e.g. "$2,800".',
        width: "50%",
      },
    },
    {
      name: "summary",
      type: "textarea",
      required: true,
      admin: {
        description: "One short line describing this package.",
      },
    },
    {
      name: "features",
      type: "array",
      labels: {
        singular: "Feature",
        plural: "Features",
      },
      admin: {
        description:
          "The bullet-point list of what's included in this package.",
      },
      fields: [
        {
          name: "text",
          type: "text",
          required: true,
          admin: {
            description: "One included item, e.g. \"Up to 10 hours of coverage\".",
          },
        },
      ],
    },
    {
      name: "gallery",
      type: "relationship",
      relationTo: "photos",
      hasMany: true,
      admin: {
        description: "A small set of sample photos shown with this package.",
      },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Check this to spotlight this package in the 'Popular right now' section. Only one package should be featured at a time.",
        position: "sidebar",
      },
    },
    {
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: {
        description:
          "Controls the order packages appear in — lower numbers show up first.",
        position: "sidebar",
      },
    },
  ],
};
