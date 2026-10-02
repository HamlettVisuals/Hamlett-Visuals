import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import {
  BUTTON_TEXT_MAX,
  HEADING_MAX,
  LEAD_IN_MAX,
  SUBHEADING_MAX,
} from "#src/lib/booking-cta-limits.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The homepage "Ready when you are" section (components/home/BookingCta.tsx).
// Its contact line's text and which details it links to are set here; the
// email, phone and Instagram themselves are shared across the site and live
// on the Site Settings global instead of being repeated here.
export const BookingCta: GlobalConfig = {
  slug: "booking-cta",
  label: "Booking Section",
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
    group: "Homepage",
    description:
      "The 'Ready when you are' section on your homepage that invites people to book a session, with a line under the button: your text, followed by your contact details as links.",
    // Same Live Preview treatment as the other wired homepage globals —
    // opens automatically and scrolls to/highlights the #booking-cta section
    // via LivePreviewHighlight.
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:booking-cta`,
    },
  },
  access: publicReadAdminWrite,
  // History only — no drafts, so the one button saves straight to the live
  // site. See components/admin/PublishButton.tsx.
  versions: true,
  fields: [
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: "Ready when you are",
      maxLength: HEADING_MAX,
      admin: {
        description: `The title of this section. Up to ${HEADING_MAX} characters, so it stays on one line on phones.`,
      },
    },
    {
      name: "subheading",
      type: "text",
      defaultValue:
        "Tell me what you're planning and I'll get back to you within a day.",
      maxLength: SUBHEADING_MAX,
      admin: {
        description: `The line of text under the title. Up to ${SUBHEADING_MAX} characters, so it stays within three lines on phones.`,
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
      // Heading for the contact-line fields below, and the pointer to
      // Site Settings where the email, phone and Instagram themselves live.
      name: "contactLineIntro",
      type: "ui",
      admin: {
        components: {
          Field: "/components/admin/ContactLineIntro#default",
        },
      },
    },
    {
      // Column name kept from when this was the sentence's opening words.
      name: "contactLeadIn",
      type: "text",
      label: "Contact line text",
      defaultValue: "Prefer to reach out directly?",
      maxLength: LEAD_IN_MAX,
      admin: {
        description: `Shown before your contact details, e.g. "Prefer to reach out directly?" Up to ${LEAD_IN_MAX} characters. Leave empty to show just the links.`,
      },
    },
    // One switch per contact detail (components/admin/ContactSwitchField.tsx
    // shows what Site Settings has for each). The line is her text, then
    // the links (lib/booking-contact-line.ts); with no text and no links
    // it isn't shown.
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
      // "Text on its own" note when all three switches are off.
      name: "contactLineAloneNote",
      type: "ui",
      admin: {
        components: { Field: "/components/admin/ContactLineAloneNote#default" },
      },
    },
  ],
};
