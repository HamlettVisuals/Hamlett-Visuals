import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";

// Single source of truth for cross-section branding/contact details —
// mirrors src/lib/site-settings.ts (favicon/OG image) and the `instagram`
// constant in src/lib/site-content.ts (reused by the Footer, Booking CTA and
// homepage Instagram section).
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site Settings",
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
      "Studio name, logo, contact details, Instagram, and the small icon/preview image used when the site is shared or shows up in a browser tab. These values are reused in several places across the site.",
    // Same Live Preview treatment as the other wired globals (openByDefault
    // + scroll-to-highlight), but this data isn't one homepage section —
    // it's cross-cutting (Footer, Booking CTA, and the homepage Instagram
    // section all render pieces of it). Footer is the fullest picture of it
    // (both contact fields and the Instagram handle/QR code, vs. partial
    // use elsewhere), and both field-group descriptions above already name
    // it first, so it's the closest thing to a "home" for this global —
    // #footer was picked over skipping the highlight entirely so every
    // global in the nav behaves the same way from an editor's perspective.
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:footer`,
    },
  },
  access: publicReadAdminWrite,
  // History only — no drafts, so the one button saves straight to the live
  // site. See components/admin/PublishButton.tsx.
  versions: true,
  fields: [
    {
      name: "siteName",
      type: "text",
      required: true,
      defaultValue: "Hamlett Visuals",
      admin: {
        description: "Your studio's name, used across the site.",
      },
    },
    {
      // Rendered by components/Wordmark.tsx in both the header (Nav.tsx)
      // and the footer. Alt text is derived from siteName above, and an
      // empty field falls back to siteName as text — see Wordmark.tsx.
      name: "logo",
      type: "upload",
      relationTo: "logos",
      admin: {
        description:
          "Your logo, shown at the top-left of every page and in the footer. Best as a PNG with a transparent background. Leave empty to show your studio name as text instead.",
      },
    },
    {
      name: "favicon",
      type: "upload",
      relationTo: "photos",
      admin: {
        description:
          "The small icon shown in a browser tab. Works best as a simple square image.",
      },
    },
    {
      name: "ogImage",
      type: "upload",
      relationTo: "photos",
      admin: {
        description:
          "The preview image shown when the site is shared on social media or messaging apps.",
      },
    },
    {
      name: "ogImageAlt",
      type: "text",
      defaultValue: "Hamlett Visuals",
      admin: {
        description:
          "A short description of the preview image above, for screen readers and search engines.",
      },
    },
    {
      type: "group",
      name: "contact",
      admin: {
        description: "How people reach you — shown in the footer and booking section.",
      },
      fields: [
        {
          name: "email",
          type: "email",
          defaultValue: "hello@example.com",
          admin: {
            description: "Your contact email address.",
          },
        },
        {
          name: "phoneDisplay",
          type: "text",
          defaultValue: "+0 000 000 0000",
          admin: {
            description: "Your phone number as shown on the page.",
          },
        },
        {
          name: "phoneHref",
          type: "text",
          defaultValue: "tel:+00000000000",
          admin: {
            description:
              'Makes the phone number above tappable on mobile. Keep the same format: "tel:" followed by the number with no spaces or dashes, e.g. tel:+15551234567.',
          },
        },
      ],
    },
    {
      type: "group",
      name: "instagram",
      admin: {
        description: "Your Instagram account, shown in the footer and homepage.",
      },
      fields: [
        {
          name: "handle",
          type: "text",
          defaultValue: "@hamlettvisuals",
          admin: {
            description: "Your Instagram @handle, as shown on the page.",
          },
        },
        {
          name: "url",
          type: "text",
          defaultValue: "https://www.instagram.com/hamlettvisuals/",
          admin: {
            description: "The web address your Instagram handle links to.",
          },
        },
      ],
    },
  ],
};
