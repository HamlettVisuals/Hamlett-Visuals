import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";
import {
  CTA_LABEL_MAX,
  HERO_PHOTOS_MAX,
  SECONDS_PER_PHOTO_DEFAULT,
  SECONDS_PER_PHOTO_MAX,
  SECONDS_PER_PHOTO_MIN,
  SECONDS_PER_PHOTO_STEP,
} from "#src/lib/hero-limits.ts";

// The hero's rotating slides are the rows in "Hero slides" below, in the
// order she drags them into. Left empty, they fall back to one photo per
// published category (see src/components/home/Hero.tsx). Either way each
// slide is cropped around the photo's own focal point (set on the photo),
// and a slide's optional mobile image replaces it on phones and tablets.
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
      name: "slides",
      type: "array",
      maxRows: HERO_PHOTOS_MAX,
      label: "Hero slides",
      labels: { singular: "Slide", plural: "Slides" },
      admin: {
        description: `Optional. Add the photos that rotate behind your headline, then drag them into order (up to ${HERO_PHOTOS_MAX}). Leave empty to use your category cover photos.`,
      },
      fields: [
        {
          name: "photo",
          type: "upload",
          relationTo: "photos",
          required: true,
          label: "Main image",
          admin: {
            description:
              "Wide, landscape photos work best here. Click the most important part of the photo to set a focal point so it stays in frame on every screen size.",
          },
        },
        {
          // Shown below 1024px wide (the header's breakpoint) in place of
          // the main image; see components/home/Hero.tsx.
          name: "mobilePhoto",
          type: "upload",
          relationTo: "photos",
          label: "Mobile image",
          admin: {
            description:
              "Optional. Use a tall/portrait photo if the main image doesn't crop well on phones.",
          },
        },
      ],
    },
    {
      // How long each slide holds before the next fades in
      // (components/home/Hero.tsx); shown as a slider
      // (HeroSecondsField.tsx). The crossfade length is fixed.
      name: "secondsPerPhoto",
      type: "number",
      label: "Seconds per photo",
      required: true,
      min: SECONDS_PER_PHOTO_MIN,
      max: SECONDS_PER_PHOTO_MAX,
      defaultValue: SECONDS_PER_PHOTO_DEFAULT,
      validate: (value: number | null | undefined) =>
        typeof value === "number" && Number.isInteger(value / SECONDS_PER_PHOTO_STEP)
          ? true
          : `Pick a value from ${SECONDS_PER_PHOTO_MIN} to ${SECONDS_PER_PHOTO_MAX} seconds, in half seconds.`,
      admin: {
        description: "How long each photo stays before the next one fades in.",
        components: { Field: "/components/admin/HeroSecondsField#default" },
      },
    },
    {
      // Replaced by "slides" above; its picks were copied there by the
      // 20260927 hero_slides migration. Kept (hidden) so that migration
      // stays additive while the live site still reads it — drop it after
      // this ships (docs/launch-checklist.md).
      name: "heroPhotos",
      type: "upload",
      relationTo: "photos",
      hasMany: true,
      maxRows: HERO_PHOTOS_MAX,
      label: "Hero photos (old)",
      admin: { hidden: true },
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
