import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The two testimonials shown here are whichever Testimonials collection
// entries have `featured` checked — this global is just the heading/link row
// above them (src/components/home/Testimonials.tsx).
export const TestimonialsTeaser: GlobalConfig = {
  slug: "testimonials-teaser",
  label: "Testimonials Teaser",
  admin: {
    group: "Homepage",
    description:
      "The 'In their words' preview on the homepage. To change WHICH client quotes appear here, go to Testimonials and check 'featured' on the ones you want (pick exactly two) — this page only controls the heading and link text around them.",
    // Same Live Preview treatment as Hero/About/CategoriesIntro/FeaturedOffer
    // — opens automatically and scrolls to/highlights the #testimonials
    // section via LivePreviewHighlight. The quotes themselves come from the
    // Testimonials collection, which stays out of scope here (like
    // Categories/Photos/Pricing Rows) — only heading/linkLabel/linkHref
    // are wired.
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:testimonials`,
    },
  },
  access: publicReadAdminWrite,
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: "In their words",
      admin: {
        description: "The title above the client quotes.",
      },
    },
    {
      name: "linkLabel",
      type: "text",
      defaultValue: "All testimonials",
      admin: {
        description:
          "The text of the link that takes people to the full testimonials page.",
      },
    },
    {
      name: "linkHref",
      type: "text",
      defaultValue: "/testimonials",
      admin: {
        hidden: true,
        description:
          "Where that link goes. Locked to the testimonials page.",
      },
    },
  ],
};
