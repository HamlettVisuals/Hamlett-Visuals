import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { CLOSE_EDITOR_BUTTON } from "#src/lib/admin-components.ts";

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  admin: {
    // Undo / Redo / Discard next to Save — see components/admin/EditHistory.tsx.
    components: {
      edit: {
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
        ],
      },
      // ✕ back to this list, in the top bar of the Edit and History tabs.
      // See components/admin/CloseEditorButton.tsx.
      views: {
        edit: {
          default: { actions: [CLOSE_EDITOR_BUTTON] },
          versions: { actions: [CLOSE_EDITOR_BUTTON] },
          version: { actions: [CLOSE_EDITOR_BUTTON] },
        },
      },
    },
    hideAPIURL: true,
    useAsTitle: "clientName",
    defaultColumns: ["clientName", "category", "published"],
    description:
      "Client quotes and reviews, shown on the Testimonials page. Pick which ones appear on your homepage in Testimonials Teaser.",
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
      // Retired: the homepage picks come from the Testimonials Teaser
      // global's "Testimonials" field now (carried over once by
      // src/scripts/carryOverFeaturedTestimonials.ts). Hidden rather than
      // removed so the column isn't dropped. Nothing reads it any more.
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
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
