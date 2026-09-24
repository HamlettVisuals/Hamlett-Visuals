import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The intro copy and "How it works" steps on the standalone /booking page —
// same pattern as About (heading + short copy + a repeating list), just on
// its own route instead of a homepage section. See src/app/(site)/booking/
// page.tsx: this replaces that page's hardcoded `steps` array and intro
// paragraph.
export const Booking: GlobalConfig = {
  slug: "booking",
  label: "Booking",
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
    group: "Booking",
    description:
      "The heading, intro paragraph, and \"How it works\" steps on the Book a session page.",
    // Same Live Preview treatment as About/Hero (see globals/About.ts), but
    // pointed at /booking instead of the homepage — this is the first
    // wired global that isn't a homepage section. There's no single
    // existing element that already covers heading + intro + steps
    // together (they span the page header and the "How it works" card
    // below the form), so — same call as Site Settings — this highlights
    // the page's own root container (#booking, added to BookingPage) rather
    // than picking one of its sub-elements arbitrarily.
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/booking#live-preview:booking`,
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
      defaultValue: "Book a session",
      admin: {
        description: "The title at the top of the Booking page.",
      },
    },
    {
      name: "intro",
      type: "textarea",
      required: true,
      defaultValue:
        "Tell her a little about what you have in mind and she'll follow up to work out the rest.",
      admin: {
        description: "The short paragraph under the heading.",
      },
    },
    {
      name: "steps",
      type: "array",
      minRows: 1,
      defaultValue: [
        {
          title: "Pick a date",
          description:
            "Have a date in mind, or leave it open — either works to start.",
        },
        {
          title: "Share the details",
          description:
            "Tell her the session type, who's involved, and what you're picturing.",
        },
        {
          title: "She confirms",
          description:
            "She follows up within a day or two to confirm availability and lock it in.",
        },
      ],
      admin: {
        description:
          "The numbered \"How it works\" steps shown above the booking form.",
      },
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
          admin: {
            description: "A short step title, e.g. \"Submit your request\".",
          },
        },
        {
          name: "description",
          type: "textarea",
          required: true,
          admin: {
            description:
              "One line explaining the step, e.g. \"I'll follow up within 48 hours.\"",
          },
        },
      ],
    },
  ],
};
