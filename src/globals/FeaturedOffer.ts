import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The offer shown here is whichever row in the Pricing / Offer Rows
// collection has `featured` checked — this global is just the section
// heading and badge text around it (src/components/home/FeaturedOffer.tsx).
export const FeaturedOffer: GlobalConfig = {
  slug: "featured-offer",
  label: "Featured Offer",
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
      "The 'Popular right now' spotlight section. To change WHICH package is featured here, go to Pricing / Offer Rows and check 'featured' on the one you want — this page only controls the heading and badge text around it.",
    // Same Live Preview treatment as Hero/About/CategoriesIntro — opens
    // automatically and scrolls to/highlights the #hot-offer section via
    // LivePreviewHighlight. Only heading/badgeLabel are wired here — the
    // featured package's own title/price/etc. come from whichever Pricing /
    // Offer Row has `featured` checked, which doesn't live-sync (see that
    // collection's note in payload.config.ts).
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:hot-offer`,
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
