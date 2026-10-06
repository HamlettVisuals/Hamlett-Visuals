import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";
import {
  BOOKING_CONFIRMATION_HEADING,
  BOOKING_CONFIRMATION_MESSAGE,
  BOOKING_DATE_HELP,
  BOOKING_HOW_IT_WORKS,
  BOOKING_SUBMIT_LABEL,
} from "#src/lib/booking-copy.ts";

// The Booking page's own words (/booking): heading, intro, the "How it works"
// box and its steps, the form's button and date help text, and what the
// thank-you says after sending. The defaults are the text the page had
// before these were editable (lib/booking-copy.ts).
//
// The intro copy and "How it works" steps on the standalone /booking page —
// same pattern as About (heading + short copy + a repeating list), just on
// its own route instead of a homepage section. See src/app/(site)/booking/
// page.tsx: this replaces that page's hardcoded `steps` array and intro
// paragraph.
export const Booking: GlobalConfig = {
  slug: "booking",
  // The same name in the editor title, breadcrumb and sidebar.
  label: "Booking Page",
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
      "The words on your Book a session page: heading, intro, the \"How it works\" steps, the form's button, and the thank-you after someone sends a request.",
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
      name: "howItWorksHeading",
      type: "text",
      label: "\"How it works\" heading",
      required: true,
      defaultValue: BOOKING_HOW_IT_WORKS,
      admin: { description: "The title of the steps box." },
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
      labels: { singular: "Step", plural: "Steps" },
      admin: {
        description:
          "The numbered \"How it works\" steps shown above the booking form. Add as many as you like; drag to reorder.",
        // Each row's header shows its number and title (StepRowLabel.tsx).
        components: { RowLabel: "/components/admin/StepRowLabel#default" },
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
    {
      name: "dateHelpText",
      type: "textarea",
      label: "Date help text",
      required: true,
      defaultValue: BOOKING_DATE_HELP,
      admin: { rows: 2, description: "The line under the preferred date and time." },
    },
    {
      name: "submitLabel",
      type: "text",
      label: "Button text",
      required: true,
      defaultValue: BOOKING_SUBMIT_LABEL,
      maxLength: 40,
      admin: { description: "The button that sends the request." },
    },
    {
      name: "confirmationHeading",
      type: "text",
      label: "Thank-you heading",
      required: true,
      defaultValue: BOOKING_CONFIRMATION_HEADING,
      admin: {
        description:
          "Shown after someone sends a request. {name} becomes their first name (or \"there\" if they gave none).",
      },
    },
    {
      name: "confirmationMessage",
      type: "textarea",
      label: "Thank-you message",
      required: true,
      defaultValue: BOOKING_CONFIRMATION_MESSAGE,
      admin: { rows: 3, description: "The text under the thank-you heading." },
    },
  ],
};
