import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { navDestinations } from "#src/lib/nav-destinations.ts";

// Mirrors src/components/Footer.tsx. Contact email/phone and the Instagram
// handle live on Site Settings (shared with the Booking CTA section).
export const FinalCtaFooter: GlobalConfig = {
  slug: "final-cta-footer",
  label: "Final CTA / Footer",
  admin: {
    group: "Site",
    description:
      "The very bottom of every page: the closing message, the 'Book' button, and the small links row (Portfolio, Backstage, Privacy Policy, etc.). Contact details and the Instagram link shown here come from Site Settings.",
  },
  access: publicReadAdminWrite,
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "signOffLine",
      type: "text",
      required: true,
      defaultValue: "Let's make something worth keeping.",
      admin: {
        description: "The closing message shown above the 'Book' button.",
      },
    },
    {
      name: "ctaLabel",
      type: "text",
      defaultValue: "Book a session",
      admin: {
        description: "The text on the 'Book' button.",
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
      name: "footerNav",
      type: "array",
      labels: { singular: "Link", plural: "Links" },
      admin: {
        description:
          "The small row of links at the very bottom of the page. Add, remove, reorder, or rename any of them, and pick where each one goes from the dropdown.",
      },
      defaultValue: [
        { label: "Portfolio", href: "/#categories" },
        { label: "Backstage", href: "/backstage" },
        { label: "Testimonials", href: "/testimonials" },
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Terms & Conditions", href: "/terms" },
      ],
      fields: [
        {
          name: "label",
          type: "text",
          required: true,
          admin: {
            description: "The word or short phrase shown for this link.",
          },
        },
        {
          name: "href",
          type: "select",
          required: true,
          options: [...navDestinations],
          admin: {
            description:
              "Where this link goes. Pick from the real pages and sections on the site — this can't be typed in, so it can't end up pointing somewhere that doesn't exist.",
          },
        },
      ],
    },
    {
      name: "copyrightName",
      type: "text",
      defaultValue: "Hamlett Visuals",
      admin: {
        description:
          "The name shown in the copyright line at the very bottom of the page (e.g. \"© 2026 [this name]. All rights reserved.\").",
      },
    },
  ],
};
