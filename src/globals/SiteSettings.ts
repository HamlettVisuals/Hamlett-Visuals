import type { FieldAccess, GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import {
  instagramUsername,
  validateInstagramHandle,
  validatePhone,
} from "#src/lib/contact-details.ts";
import { FOOTER_LOGO, HEADER_LOGO } from "#src/lib/logo-size.ts";
import { phoneShownAnywhere } from "#src/lib/phone-shown.ts";
import { serverURL } from "#src/lib/server-url.ts";

// Single source of truth for cross-section branding/contact details —
// mirrors src/lib/site-settings.ts (favicon/OG image). Email, phone and
// Instagram are shown by the Footer, the Booking CTA, the homepage Instagram
// section and (email and phone) the privacy policy, all through
// lib/contact-details.ts.
// The phone number reaches signed-out API readers only while the site
// shows it somewhere (lib/phone-shown.ts). The site's own pages read on the
// server, which skips this, and decide for themselves from the switches.
const readPhone: FieldAccess = async ({ req }) => Boolean(req.user) || (await phoneShownAnywhere(req));
// The retired phone fields are the studio's only.
const studioOnly: FieldAccess = ({ req }) => Boolean(req.user);

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
      "Studio name, logo, email, phone, Instagram, and the small icon/preview image used when the site is shared or shows up in a browser tab. These values are reused in several places across the site.",
    // Same Live Preview treatment as the other wired globals (openByDefault
    // + scroll-to-highlight), but this data isn't one homepage section —
    // it's cross-cutting (Footer, Booking CTA, and the homepage Instagram
    // section all render pieces of it). Footer is the fullest picture of it
    // (both contact fields and the Instagram handle, vs. partial
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
      // Height of the header logo in px (Wordmark.tsx). Capped below the
      // fixed header height so it can't make the header taller; phones get
      // 80% of it, clamped to the smaller phone header. See lib/logo-size.ts.
      name: "logoHeight",
      type: "number",
      label: "Header logo size",
      min: HEADER_LOGO.min,
      max: HEADER_LOGO.max,
      defaultValue: HEADER_LOGO.default,
      admin: {
        description: "How tall your logo is at the top of the page. Phones show it a little smaller.",
        condition: (data) => Boolean(data?.logo),
        components: {
          Field: {
            path: "/components/admin/LogoSizeField#default",
            clientProps: { defaultHeight: HEADER_LOGO.default },
          },
        },
      },
    },
    {
      // Height of the footer logo in px (Wordmark.tsx). See lib/logo-size.ts.
      name: "footerLogoHeight",
      type: "number",
      label: "Footer logo size",
      min: FOOTER_LOGO.min,
      max: FOOTER_LOGO.max,
      defaultValue: FOOTER_LOGO.default,
      admin: {
        description: "How tall your logo is in the footer at the bottom of every page.",
        condition: (data) => Boolean(data?.logo),
        components: {
          Field: {
            path: "/components/admin/LogoSizeField#default",
            clientProps: { defaultHeight: FOOTER_LOGO.default },
          },
        },
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
        description:
          "How people reach you — shown in the footer and the homepage booking section.",
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
          // Optional. Stored as she typed it; lib/contact-details.ts turns
          // it into "(555) 123-4567" and a tel: link wherever it's shown,
          // and leaves the number out everywhere while this is empty.
          name: "phone",
          type: "text",
          label: "Phone number (optional)",
          access: { read: readPhone },
          validate: (value: string | null | undefined) => validatePhone(value),
          admin: {
            description:
              "Leave empty to keep your number off the site. US numbers can be typed any way, e.g. 555 123 4567; for other countries start with + and the country code, spaced the way you want it shown.",
          },
        },
        {
          // Replaced by `phone` above; kept hidden so the columns (and the
          // placeholder values they still hold) aren't dropped. Nothing
          // reads them any more.
          name: "phoneDisplay",
          type: "text",
          access: { read: studioOnly },
          admin: { hidden: true },
        },
        {
          name: "phoneHref",
          type: "text",
          access: { read: studioOnly },
          admin: { hidden: true },
        },
      ],
    },
    {
      type: "group",
      name: "instagram",
      admin: {
        description:
          "Your Instagram account, shown in the footer, the homepage Instagram section and the booking section.",
      },
      fields: [
        {
          // The profile link is made from this (see
          // lib/contact-details.ts), so there's no separate address to keep
          // in step. Saved as "@username" whichever way she typed it.
          name: "handle",
          type: "text",
          label: "Instagram username",
          defaultValue: "@hamlettvisuals",
          validate: (value: string | null | undefined) => validateInstagramHandle(value),
          hooks: {
            beforeChange: [
              ({ value }) => {
                const username = instagramUsername(value);
                return username ? `@${username}` : value;
              },
            ],
          },
          admin: {
            description:
              "With or without the @, e.g. @hamlettvisuals. Your profile link is made from it. Leave empty to hide Instagram links.",
          },
        },
        {
          // Was the profile link; it's now made from the username above.
          // Hidden rather than removed so the column isn't dropped.
          name: "url",
          type: "text",
          admin: { hidden: true },
        },
      ],
    },
  ],
};
