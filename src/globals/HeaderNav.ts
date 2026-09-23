import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { navDestinations } from "#src/lib/nav-destinations.ts";
import { serverURL } from "#src/lib/server-url.ts";

// Drives navLinks + the Book button in src/components/Nav.tsx.
export const HeaderNav: GlobalConfig = {
  slug: "header-nav",
  label: "Header / Nav",
  admin: {
    hideAPIURL: true,
    components: {
      elements: {
        SaveButton: "/components/admin/PublishButton#default",
      },
    },
    group: "Site",
    description:
      "The menu bar at the top of every page: the links people see and the 'Book' button on the right.",
    // Same Live Preview treatment as the other wired globals — opens
    // automatically and scrolls to/highlights the header via
    // LivePreviewHighlight (see Nav.tsx's id="site-header").
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:site-header`,
    },
  },
  access: publicReadAdminWrite,
  // History only — no drafts, so the one button saves straight to the live
  // site. See components/admin/PublishButton.tsx.
  versions: true,
  fields: [
    {
      name: "navLinks",
      type: "array",
      labels: { singular: "Link", plural: "Links" },
      admin: {
        description:
          "The menu items shown across the top of the site, in order. Add, remove, reorder, or rename any of them, and pick where each one goes from the dropdown.",
      },
      defaultValue: [
        { label: "Portfolio", href: "/#categories" },
        { label: "About", href: "/#about" },
        { label: "Pricing", href: "/#offers" },
        { label: "Instagram", href: "/#instagram" },
        { label: "Backstage", href: "/backstage" },
        { label: "Testimonials", href: "/testimonials" },
      ],
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          admin: {
            description: "The word or short phrase shown in the menu.",
          },
        },
        {
          name: "href",
          type: "select",
          required: true,
          options: [...navDestinations],
          admin: {
            description:
              "Where this link goes. Pick from the real pages and sections on the site — this can't be typed in, so it can't end up pointing somewhere that doesn't exist.",
          },
        },
      ],
    },
    {
      name: "bookLabel",
      type: "text",
      defaultValue: "Book",
      admin: {
        description: "The text on the 'Book' button in the top-right corner.",
      },
    },
    {
      name: "bookHref",
      type: "text",
      defaultValue: "/booking",
      admin: {
        hidden: true,
        description:
          "Where the 'Book' button sends people. Locked to the booking page.",
      },
    },
  ],
};
