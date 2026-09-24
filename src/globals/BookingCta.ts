import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";

// Contact email and Instagram handle are shared across sections and live on
// the Site Settings global instead of being repeated here.
export const BookingCta: GlobalConfig = {
  slug: "booking-cta",
  label: "Booking CTA",
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
      "The 'Ready when you are' section on the homepage that invites people to book a session. (The email address shown there comes from Site Settings.)",
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
      admin: {
        description: "The title of this section.",
      },
    },
    {
      name: "subheading",
      type: "text",
      defaultValue:
        "Tell me what you're planning and I'll get back to you within a day.",
      admin: {
        description: "The line of text under the title.",
      },
    },
    {
      name: "ctaLabel",
      type: "text",
      defaultValue: "Book a session",
      admin: {
        description: "The text on the button.",
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
  ],
};
