import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The hero's rotating slides are derived from the Categories collection
// (one representative photo per category — see src/components/home/Hero.tsx),
// so this global only holds the fixed text/CTA overlay.
export const Hero: GlobalConfig = {
  slug: "hero",
  label: "Hero",
  admin: {
    group: "Homepage",
    description:
      "The big image and headline at the very top of the homepage — the first thing anyone sees.",
    livePreview: {
      // Opens Live Preview automatically when editing Hero specifically —
      // other globals fall back to the root config (manual toggle) until
      // they're wired to the frontend the same way Hero is. Ignored once a
      // user has manually toggled Live Preview for this document; see
      // openByDefault in Payload's LivePreviewConfig docs.
      openByDefault: true,
      // The "live-preview:<element id>" hash is read by
      // LivePreviewHighlight (src/components/LivePreviewHighlight.tsx) on
      // the frontend to scroll to and briefly highlight that element on
      // load — see that file for why a hash rather than postMessage.
      url: () => `${serverURL}/#live-preview:top`,
    },
  },
  access: publicReadAdminWrite,
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "headline",
      type: "text",
      required: true,
      defaultValue: "Moments, held.",
      admin: {
        description: "The large title text over the homepage photos.",
      },
    },
    {
      name: "subhead",
      type: "text",
      defaultValue:
        "Weddings, portraits, pets, and more — captured as they happen.",
      admin: {
        description: "The smaller line of text under the headline.",
      },
    },
    {
      name: "ctaLabel",
      type: "text",
      defaultValue: "Book a session",
      admin: {
        description: "The text on the button under the headline.",
      },
    },
    {
      name: "ctaHref",
      type: "text",
      defaultValue: "#booking-cta",
      admin: {
        hidden: true,
        description:
          "Where the button sends people. Locked to the booking section.",
      },
    },
  ],
};
