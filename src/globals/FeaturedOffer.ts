import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { BADGE_TEXT_MAX, HEADING_MAX } from "#src/lib/featured-offer-limits.ts";
import { AVAILABLE_PACKAGE_WHERE } from "#src/lib/featured-package.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The "Popular right now" spotlight (src/components/home/FeaturedOffer.tsx):
// which Package it features, plus the heading and badge text around it
// (the badge text also marks that package in Offers & pricing). With
// "Show on homepage" off, no package picked, or one that's since been
// hidden or trashed or whose category is hidden or trashed, the section
// isn't shown at all, and no Offers & pricing row gets the badge.
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
      "The 'Popular right now' spotlight on your homepage. Pick which package to feature below.",
    // Same Live Preview treatment as Hero/About/CategoriesIntro — opens
    // automatically and scrolls to/highlights the #hot-offer section via
    // LivePreviewHighlight, falling back to the Offers & pricing section
    // while no package is featured (#hot-offer isn't rendered then). All
    // three fields follow the form as you type, the picked package's own
    // details included (FeaturedOffer.tsx fetches it at depth 2).
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:hot-offer,offers`,
    },
  },
  access: publicReadAdminWrite,
  // History only — no drafts, so the one button saves straight to the live
  // site. See components/admin/PublishButton.tsx.
  versions: true,
  fields: [
    {
      // Hides the spotlight (and the badge in Offers & pricing) without
      // losing the package, heading and badge below, which are greyed out
      // while it's off (FeaturedOfferSwitchField.tsx). Replaced the
      // package dropdown's old "None" choice.
      name: "showOnHomepage",
      type: "checkbox",
      label: "Show on homepage",
      defaultValue: true,
      admin: {
        description:
          "Turn off to hide this spotlight from your homepage. Your package, heading and badge are kept for when you turn it back on.",
        components: {
          Field: "/components/admin/FeaturedOfferSwitchField#default",
        },
      },
    },
    {
      // Replaces the old per-row `featured` checkbox on Packages
      // (kept there, hidden, so the column isn't dropped). A dropdown
      // (components/admin/FeaturedPackageField.tsx) listing only packages
      // the site can show, with a warning when the picked one won't show
      // or has no sample photos; filterOptions is the same rule, enforced
      // on save. To hide the section, turn off "Show on homepage" above.
      name: "featuredPackage",
      type: "relationship",
      relationTo: "pricing-rows",
      hasMany: false,
      label: "Featured package",
      filterOptions: AVAILABLE_PACKAGE_WHERE,
      admin: {
        description: "The package to spotlight.",
        components: {
          Field: "/components/admin/FeaturedPackageField#default",
        },
      },
    },
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: "Popular right now",
      maxLength: HEADING_MAX,
      admin: {
        description: `The title above the featured package. Up to ${HEADING_MAX} characters, so it stays on one line on phones.`,
      },
    },
    {
      name: "badgeLabel",
      type: "text",
      label: "Badge text",
      defaultValue: "Hot offer",
      maxLength: BADGE_TEXT_MAX,
      admin: {
        description: `The small highlighted tag on the featured package, here and on its row in Offers & pricing. Up to ${BADGE_TEXT_MAX} characters.`,
      },
    },
  ],
};
