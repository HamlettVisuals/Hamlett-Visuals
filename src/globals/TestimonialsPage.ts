import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { DEFAULT_TESTIMONIALS_PAGE_QUOTE_FONT, validateQuoteFont } from "#src/lib/quote-font-options.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The /testimonials page's own words and look ("Page settings" on the
// Testimonials list): its title and intro, the "Worked with me?" section at
// the bottom, and the quotes' font. The testimonials themselves are the
// Testimonials collection. Publish, History and Live Preview like the
// homepage globals; the title, intro and review section follow the form
// as she types, the font shows once published.

export const INTRO_DEFAULT =
  "A few words from people I’ve worked with, sorted by the kind of shoot they came for.";
export const REVIEW_TEXT_DEFAULT =
  "I’d love to hear how it went. Share your experience, and it might end up on this page.";

export const TestimonialsPage: GlobalConfig = {
  slug: "testimonials-page",
  label: "Testimonials Page",
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
    description: "The title, intro and font of your Testimonials page, and the review section at the bottom.",
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/testimonials`,
    },
  },
  access: publicReadAdminWrite,
  versions: true,
  fields: [
    {
      // All / Needs review / Page settings / Trash, as on the list.
      name: "tabs",
      type: "ui",
      admin: { components: { Field: "/components/admin/Testimonials/Tabs#PageSettingsTabs" } },
    },
    {
      name: "title",
      type: "text",
      required: true,
      defaultValue: "Testimonials",
      maxLength: 40,
      admin: { description: "The page's heading, also used for the browser tab." },
    },
    {
      name: "intro",
      type: "textarea",
      defaultValue: INTRO_DEFAULT,
      maxLength: 240,
      admin: { rows: 3, description: "A line or two under the heading. Leave empty for none." },
    },
    {
      name: "quoteFont",
      type: "text",
      label: "Quote font",
      defaultValue: DEFAULT_TESTIMONIALS_PAGE_QUOTE_FONT,
      validate: validateQuoteFont,
      admin: {
        description: "The typeface of the quotes on this page.",
        components: { Field: "/components/admin/QuoteFontField#default" },
      },
    },
    {
      name: "showReviewSection",
      type: "checkbox",
      label: "Show the review section",
      defaultValue: false,
      admin: {
        description:
          "The section at the bottom inviting past clients to leave a review. Its button doesn't lead anywhere yet, so keep this off for now.",
        components: { Field: "/components/admin/ShowOnWebsiteField#default" },
      },
    },
    {
      name: "reviewHeading",
      type: "text",
      label: "Review section heading",
      defaultValue: "Worked with me?",
      maxLength: 40,
    },
    {
      name: "reviewText",
      type: "textarea",
      label: "Review section text",
      defaultValue: REVIEW_TEXT_DEFAULT,
      maxLength: 240,
      admin: { rows: 2 },
    },
  ],
};
