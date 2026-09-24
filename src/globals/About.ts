import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";

export const About: GlobalConfig = {
  slug: "about",
  label: "About",
  admin: {
    hideAPIURL: true,
    components: {
      elements: {
        SaveButton: "/components/admin/PublishButton#default",
        beforeDocumentControls: ["/components/admin/EditHistory#default"],
      },
    },
    group: "Homepage",
    description: "The 'About' section on the homepage — your photo and your bio.",
    // Same Live Preview treatment as Hero (see globals/Hero.ts) — opens
    // automatically and scrolls to/highlights the #about section via
    // LivePreviewHighlight.
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:about`,
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
      defaultValue: "About",
      admin: {
        description: "The title above this section.",
      },
    },
    {
      name: "portrait",
      type: "upload",
      relationTo: "photos",
      admin: {
        description:
          "Your photo, shown next to the bio. Upright/portrait-shaped photos work best.",
      },
    },
    {
      name: "bio",
      type: "richText",
      admin: {
        description:
          "The paragraph(s) about you and your work, shown next to your photo.",
      },
    },
  ],
};
