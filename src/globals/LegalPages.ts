import type { GlobalConfig } from "payload";
import {
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { LEGAL_PAGES, stampLastUpdated, type LegalSlug } from "#src/lib/legal-pages.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The Privacy Policy (/privacy-policy) and Terms & Conditions (/terms)
// pages, one global each, written entirely by her: a title, the text, and
// the "Last updated" date. Publish, History and Live Preview like the other
// globals. Until the text has words in it the page isn't on the site and
// its footer link is hidden (lib/legal-pages.ts); publishing brings both.

function legalPage(href: keyof typeof LEGAL_PAGES, description: string): GlobalConfig {
  const { slug, title } = LEGAL_PAGES[href];
  return {
    slug: slug satisfies LegalSlug,
    label: title,
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
      description,
      // Through the preview route, which lets a signed-in admin see the
      // page before it has any text (the public page 404s until then).
      livePreview: {
        openByDefault: true,
        url: () => `${serverURL}/api/preview/legal?page=${slug}`,
      },
    },
    access: publicReadAdminWrite,
    // History only — no drafts, so the one button saves straight to the
    // live site. See components/admin/PublishButton.tsx.
    versions: true,
    hooks: {
      beforeChange: [({ data, originalDoc }) => stampLastUpdated(data, originalDoc)],
    },
    fields: [
      {
        name: "title",
        type: "text",
        required: true,
        defaultValue: title,
        maxLength: 60,
        admin: { description: "The page's heading, also used for the browser tab." },
      },
      {
        name: "body",
        type: "richText",
        label: "Text",
        // Paragraphs, two heading sizes, bold/italic/underline, links and
        // lists: what a policy needs, styled by the site (LegalPage.tsx).
        // No images, uploads, tables or code. Internal links go to a
        // portfolio category's page; anything else is an address.
        editor: lexicalEditor({
          features: () => [
            ParagraphFeature(),
            HeadingFeature({ enabledHeadingSizes: ["h2", "h3"] }),
            BoldFeature(),
            ItalicFeature(),
            UnderlineFeature(),
            LinkFeature({ enabledCollections: ["categories"] }),
            OrderedListFeature(),
            UnorderedListFeature(),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ],
        }),
        admin: {
          description:
            "Write your policy here. Use headings to break it into sections. While this is empty, the page and its footer link are hidden.",
        },
      },
      {
        name: "lastUpdated",
        type: "date",
        label: "Last updated",
        admin: {
          position: "sidebar",
          date: { pickerAppearance: "dayOnly", displayFormat: "MMMM d, yyyy" },
          description: "Updates automatically when you change the text. You can override it.",
        },
      },
    ],
  };
}

export const PrivacyPolicy = legalPage(
  "/privacy-policy",
  "Your Privacy Policy page: how you collect and use people's information.",
);

export const Terms = legalPage("/terms", "Your Terms & Conditions page: bookings, payments, cancellations and usage.");
