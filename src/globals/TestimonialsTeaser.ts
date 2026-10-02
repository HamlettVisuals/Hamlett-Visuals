import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";
import { TESTIMONIAL_PICKS_MAX, testimonialPickOptions } from "#src/lib/teaser-testimonials.ts";
import { HEADING_MAX, LINK_TEXT_MAX } from "#src/lib/testimonials-teaser-limits.ts";

// The homepage "In their words" section (src/components/home/Testimonials.tsx):
// which testimonials it shows, in order, plus the heading and link above
// them. With none picked, or none still shown on the site, the section is
// left out.
export const TestimonialsTeaser: GlobalConfig = {
  slug: "testimonials-teaser",
  label: "Testimonials Section",
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
      "The 'In their words' section on your homepage. Pick up to 4 testimonials to show.",
    // Same Live Preview treatment as the other homepage globals — opens
    // automatically and scrolls to/highlights #testimonials, falling back
    // to the Instagram section while nothing is picked (#testimonials isn't
    // rendered then). Picking, removing and reordering follow the form
    // before saving (Testimonials.tsx fetches the picks at depth 2).
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:testimonials,instagram`,
    },
  },
  access: publicReadAdminWrite,
  // History only — no drafts, so the one button saves straight to the live
  // site. See components/admin/PublishButton.tsx.
  versions: true,
  fields: [
    {
      // Replaces the old per-testimonial `featured` checkbox (kept on
      // Testimonials, hidden, so the column isn't dropped). Shown as rows
      // with drag handles and a picker to add more
      // (TestimonialPicksField.tsx); filterOptions offers only
      // testimonials shown on the site (and nothing more once 4 are
      // picked) and refuses saving while a pick
      // that's since been hidden or trashed is still in the list
      // (TestimonialPicksNote says which).
      name: "testimonials",
      type: "relationship",
      relationTo: "testimonials",
      hasMany: true,
      maxRows: TESTIMONIAL_PICKS_MAX,
      label: "Testimonials",
      filterOptions: testimonialPickOptions,
      admin: {
        isSortable: true,
        allowCreate: false,
        allowEdit: false,
        description: `Pick up to ${TESTIMONIAL_PICKS_MAX} testimonials and drag ⋮⋮ to change their order. With none picked, this section is hidden.`,
        components: {
          Field: "/components/admin/TestimonialPicksField#default",
          afterInput: ["/components/admin/TestimonialPicksNote#default"],
        },
      },
    },
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: "In their words",
      maxLength: HEADING_MAX,
      admin: {
        description: `The title above the quotes. Up to ${HEADING_MAX} characters, so it stays on one line on phones.`,
      },
    },
    {
      name: "linkLabel",
      type: "text",
      label: "Link text",
      defaultValue: "All testimonials",
      maxLength: LINK_TEXT_MAX,
      admin: {
        description: `The link to your full Testimonials page. Up to ${LINK_TEXT_MAX} characters, so it stays on one line on phones.`,
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
