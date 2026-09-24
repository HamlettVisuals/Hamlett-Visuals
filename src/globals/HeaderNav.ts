import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { navDestinations } from "#src/lib/nav-destinations.ts";
import { BOOK_LABEL_MAX, NAV_LABEL_MAX, NAV_MAX_LINKS } from "#src/lib/nav-limits.ts";
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
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
        ],
      },
    },
    group: "Site",
    description:
      "The menu bar at the top of every page: the links people see and the 'Book' button on the right. Your logo on the left is set in Site Settings.",
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
      label: "Menu links",
      labels: { singular: "Link", plural: "Links" },
      maxRows: NAV_MAX_LINKS,
      admin: {
        description: "The links across the top of your site. Drag to reorder.",
        components: {
          // Compact one-line rows (plus the Book button text) instead of
          // Payload's collapsible array rows — see NavLinksField.tsx.
          Field: "/components/admin/NavLinksField#default",
          // History's comparison otherwise labels rows "Item 01", "Item 02".
          Diff: "/components/admin/NavLinksDiff#default",
        },
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
          label: "Label",
          required: true,
          maxLength: NAV_LABEL_MAX,
        },
        {
          name: "href",
          type: "select",
          label: "Goes to",
          required: true,
          // Picked from the real pages and sections only — can't be typed
          // in, so it can't point somewhere that doesn't exist.
          options: [...navDestinations],
        },
      ],
    },
    {
      name: "bookLabel",
      type: "text",
      label: "Book button text",
      defaultValue: "Book",
      maxLength: BOOK_LABEL_MAX,
      admin: {
        // Rendered inside NavLinksField, directly under the link list, so
        // it reads as part of the same menu bar.
        hidden: true,
      },
      // Hidden only because NavLinksField draws it, so History still lists
      // it (see lib/hide-internal-history.ts).
      custom: { showInHistory: true },
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
