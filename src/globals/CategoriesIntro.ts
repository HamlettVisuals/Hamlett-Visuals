import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The category grid itself is the Categories collection — this global is
// just the section heading above it (src/components/home/Categories.tsx).
export const CategoriesIntro: GlobalConfig = {
  slug: "categories-intro",
  label: "Categories Intro",
  admin: {
    group: "Homepage",
    description:
      "The heading above the row of category photos (Weddings, Portraits, etc.) on the homepage.",
    // Same Live Preview treatment as Hero/About — opens automatically and
    // scrolls to/highlights the #categories section via
    // LivePreviewHighlight. Only the heading is wired for live-as-you-type
    // preview here — the grid itself reads from the real Categories
    // collection (see payload.config.ts: collections get plain Live Preview
    // only, refreshed on save via RefreshRouteOnSave), so it won't move as
    // you type, but a saved category change does show up.
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:categories`,
    },
  },
  access: publicReadAdminWrite,
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: "Browse by category",
      admin: {
        description: "The title text above the category photos.",
      },
    },
  ],
};
