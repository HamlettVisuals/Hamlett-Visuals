import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { navDestinations } from "#src/lib/nav-destinations.ts";
import {
  BUTTON_TEXT_MAX,
  CLOSING_LINE_MAX,
  FOOTER_LINK_LABEL_MAX,
  FOOTER_LINKS_MAX,
  LEGAL_HREFS,
} from "#src/lib/footer-limits.ts";
import { serverURL } from "#src/lib/server-url.ts";

// Mirrors src/components/Footer.tsx: the closing line and button, her footer
// links, which contact details to show, and (fixed, not editable) the legal
// links and copyright line. The contact details themselves and the studio
// name live on Site Settings, shared with the rest of the site.
export const FinalCtaFooter: GlobalConfig = {
  slug: "final-cta-footer",
  label: "Footer",
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
      "The bottom of every page: your closing line and button, your footer links and which contact details to show. The copyright line is always there, and so are Privacy Policy and Terms once they have text.",
    // Same Live Preview treatment as the other wired globals — opens
    // automatically and scrolls to/highlights the #footer section via
    // LivePreviewHighlight.
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
      name: "signOffLine",
      type: "text",
      label: "Closing line",
      required: true,
      defaultValue: "Let's make something worth keeping.",
      maxLength: CLOSING_LINE_MAX,
      admin: {
        description: `The message above the button. Up to ${CLOSING_LINE_MAX} characters, so it stays within two lines on phones.`,
      },
    },
    {
      name: "ctaLabel",
      type: "text",
      label: "Button text",
      defaultValue: "Book a session",
      maxLength: BUTTON_TEXT_MAX,
      admin: {
        description: `The text on the button, which goes to your booking page. Up to ${BUTTON_TEXT_MAX} characters, so it stays on one line.`,
      },
    },
    {
      name: "ctaHref",
      type: "text",
      defaultValue: "/booking",
      admin: {
        hidden: true,
        description:
          "Where the button sends people. Locked to the booking page.",
      },
    },
    {
      // Compact rows like Header/Nav's menu links (FooterLinksField.tsx).
      // Privacy Policy and Terms are no longer in this list: they sit in a
      // fixed row beside the copyright line (Footer.tsx), so they can't be
      // removed. The `href` options stay the full list so the column's
      // enum doesn't change; the editor leaves the legal pages out and
      // saving refuses them.
      name: "footerNav",
      type: "array",
      label: "Footer links",
      labels: { singular: "Link", plural: "Links" },
      maxRows: FOOTER_LINKS_MAX,
      admin: {
        components: {
          Field: "/components/admin/FooterLinksField#default",
          // History's comparison otherwise labels rows "Item 01", "Item 02".
          Diff: "/components/admin/NavLinksDiff#default",
        },
      },
      defaultValue: [
        { label: "Portfolio", href: "/#categories" },
        { label: "Backstage", href: "/backstage" },
        { label: "Testimonials", href: "/testimonials" },
      ],
      fields: [
        {
          name: "label",
          type: "text",
          label: "Label",
          required: true,
          maxLength: FOOTER_LINK_LABEL_MAX,
        },
        {
          name: "href",
          type: "select",
          label: "Links to",
          required: true,
          options: [...navDestinations],
          validate: (value: string | null | undefined) =>
            value && LEGAL_HREFS.includes(value)
              ? "Privacy Policy and Terms are always shown beside the copyright line. Pick another page for this link."
              : true,
        },
      ],
    },
    {
      // Heading for the contact switches below, and the pointer to Site
      // Settings where the email, phone and Instagram themselves live.
      name: "contactIntro",
      type: "ui",
      admin: {
        components: {
          Field: "/components/admin/ContactLineIntro#default",
        },
        custom: {
          title: "Contact details",
          text: "The email, phone and Instagram shown in your footer, one per line.",
        },
      },
    },
    // One switch per detail (components/admin/ContactSwitchField.tsx shows
    // what Site Settings has for each). With every switch off, or nothing
    // filled in for the ones that are on, the contact block isn't shown.
    {
      name: "showEmail",
      type: "checkbox",
      label: "Show email",
      defaultValue: true,
      admin: {
        components: { Field: "/components/admin/ContactSwitchField#default" },
        custom: { contact: "email" },
      },
    },
    {
      name: "showPhone",
      type: "checkbox",
      label: "Show phone number",
      defaultValue: true,
      admin: {
        components: { Field: "/components/admin/ContactSwitchField#default" },
        custom: { contact: "phone" },
      },
    },
    {
      name: "showInstagram",
      type: "checkbox",
      label: "Show Instagram",
      defaultValue: true,
      admin: {
        components: { Field: "/components/admin/ContactSwitchField#default" },
        custom: { contact: "instagram" },
      },
    },
    {
      // Retired: the footer no longer has an Instagram QR code. Hidden
      // rather than removed so the column isn't dropped yet (see
      // docs/launch-checklist.md). Nothing reads it any more.
      name: "showQrCode",
      type: "checkbox",
      label: "Show Instagram QR code",
      defaultValue: true,
      admin: { hidden: true },
    },
    {
      // Retired: the copyright line now uses the studio name from Site
      // Settings and the current year. Hidden rather than removed so the
      // column isn't dropped (its old default is kept too, so the column
      // doesn't change). Nothing reads it any more.
      name: "copyrightName",
      type: "text",
      defaultValue: "Hamlett Visuals",
      admin: { hidden: true },
    },
  ],
};
