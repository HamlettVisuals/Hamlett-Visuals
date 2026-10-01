import type { GlobalConfig } from "payload";
import {
  BoldFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";
import { navDestinations } from "#src/lib/nav-destinations.ts";
import {
  QUICK_LINK_LABEL_MAX,
  QUICK_LINK_TITLE_MAX,
  QUICK_LINKS_MAX,
} from "#src/lib/about-limits.ts";

export const About: GlobalConfig = {
  slug: "about",
  label: "About",
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
      "The 'About' section on the homepage — your photo, your bio and the quick links below it.",
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
      // Paragraphs, bold, italic and links to web pages, nothing else: the
      // bio sits beside her photo and is styled as plain paragraphs, so
      // headings, lists, tables or images would look out of place there.
      // Bold, italic and links are applied from the toolbar that appears
      // over selected text. Paragraphs are built into the editor; with no
      // other block to switch to, ParagraphFeature would only add a
      // one-option "Paragraph" menu, so it's left out. Internal links (to a
      // studio document) are off: only addresses.
      editor: lexicalEditor({
        features: () => [
          BoldFeature(),
          ItalicFeature(),
          LinkFeature({ enabledCollections: [] }),
          InlineToolbarFeature(),
        ],
      }),
      admin: {
        description:
          "The paragraph(s) about you and your work, shown next to your photo.",
      },
    },
    {
      // The link cards under the bio (components/home/About.tsx). Each
      // card's icon follows its destination (lib/quick-link-icons.tsx).
      // Removing every link removes the cards area entirely.
      name: "quickLinks",
      type: "array",
      label: "Quick links",
      labels: { singular: "Link", plural: "Links" },
      maxRows: QUICK_LINKS_MAX,
      admin: {
        components: {
          // Compact rows like Header/Nav's menu links instead of Payload's
          // collapsible array cards — see AboutQuickLinksField.tsx.
          Field: "/components/admin/AboutQuickLinksField#default",
          // History's comparison otherwise labels rows "Item 01", "Item 02".
          Diff: "/components/admin/QuickLinksDiff#default",
        },
      },
      defaultValue: [
        { label: "Backstage", title: "Reels & behind the scenes", href: "/backstage" },
        { label: "Testimonials", title: "Client stories", href: "/testimonials" },
      ],
      fields: [
        {
          // The card's small caption, e.g. "Backstage".
          name: "label",
          type: "text",
          label: "Title",
          required: true,
          maxLength: QUICK_LINK_LABEL_MAX,
        },
        {
          // The card's main line, e.g. "Reels & behind the scenes".
          name: "title",
          type: "text",
          label: "Subtitle",
          required: true,
          maxLength: QUICK_LINK_TITLE_MAX,
        },
        {
          name: "href",
          type: "select",
          label: "Links to",
          required: true,
          // Same pick-only destinations as Header/Nav, so a card can't
          // point somewhere that doesn't exist.
          options: [...navDestinations],
        },
      ],
    },
  ],
};
