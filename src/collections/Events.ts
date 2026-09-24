import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { formatSlug } from "#src/hooks/formatSlug.ts";

// An "Event" is a single shoot/album within a category (e.g. the
// "Priya & Daniel" wedding within the Weddings category) — see
// /portfolio/[category]/page.tsx for how Category -> Event -> Photo is
// queried and grouped for the gallery.
export const Events: CollectionConfig = {
  slug: "events",
  labels: {
    singular: "Event / Album",
    plural: "Events / Albums",
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
    defaultColumns: ["title", "category", "date", "published"],
    description:
      "A single shoot or photo set — e.g. a specific wedding or portrait session. Each one belongs to a category and holds its own set of photos.",
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
        description:
          "The name of this shoot, e.g. \"Priya & Daniel's Wedding\".",
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
          "The link used to jump straight to this shoot on its category page. Fills in automatically from the title above — you don't need to touch this.",
      },
      hooks: {
        beforeValidate: [formatSlug("title")],
      },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      required: true,
      hasMany: false,
      admin: {
        description: "Which category this shoot belongs to.",
      },
    },
    {
      name: "date",
      type: "date",
      admin: {
        description: "The date of the shoot (optional).",
        position: "sidebar",
      },
    },
    {
      name: "description",
      type: "textarea",
      admin: {
        description: "A short note about this shoot (optional).",
      },
    },
    {
      name: "published",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Turn off to hide this shoot from the live site.",
        position: "sidebar",
      },
    },
  ],
};
