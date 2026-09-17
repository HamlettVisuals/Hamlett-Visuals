import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";

// The offer shown here is whichever row in the Pricing / Offer Rows
// collection has `featured` checked — this global is just the section
// heading and badge text around it (src/components/home/FeaturedOffer.tsx).
export const FeaturedOffer: GlobalConfig = {
  slug: "featured-offer",
  label: "Featured Offer",
  admin: {
    group: "Homepage",
    description:
      "The 'Popular right now' spotlight section. To change WHICH package is featured here, go to Pricing / Offer Rows and check 'featured' on the one you want — this page only controls the heading and badge text around it.",
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
      defaultValue: "Popular right now",
      admin: {
        description: "The title above the featured package.",
      },
    },
    {
      name: "badgeLabel",
      type: "text",
      defaultValue: "Hot offer",
      admin: {
        description: "The small highlighted tag on the featured package.",
      },
    },
  ],
};
