import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";
import { CTA_LABEL_MAX, HERO_PHOTOS_MAX } from "#src/lib/hero-limits.ts";

// The hero's rotating slides are the photos picked in "Hero photos" below,
// in the order she drags them into. Left empty, they fall back to one photo
// per published category (see src/components/home/Hero.tsx). Either way each
// slide is cropped around the photo's own focal point (set on the photo).
export const Hero: GlobalConfig = {
  slug: "hero",
  label: "Hero",
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
  // History only — no drafts, so the one button saves straight to the live
  // site. See components/admin/PublishButton.tsx.
  versions: true,
  fields: [
    {
      name: "heroPhotos",
      type: "upload",
      relationTo: "photos",
      hasMany: true,
      maxRows: HERO_PHOTOS_MAX,
      label: "Hero photos",
      admin: {
        description: `Optional. Pick the photos that rotate behind your headline, then drag them into order (up to ${HERO_PHOTOS_MAX}). Leave empty to use your category cover photos. Each photo is cropped around its focal point — set that on the photo itself.`,
      },
    },
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
      label: "Button text",
      defaultValue: "Book a session",
      maxLength: CTA_LABEL_MAX,
      admin: {
        description: `The text on the button under the headline. Up to ${CTA_LABEL_MAX} characters, so it stays on one line on phones.`,
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
