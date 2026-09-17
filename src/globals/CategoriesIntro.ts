import type { GlobalConfig } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";

// The category grid itself is the Categories collection — this global is
// just the section heading above it (src/components/home/Categories.tsx).
export const CategoriesIntro: GlobalConfig = {
  slug: "categories-intro",
  label: "Categories Intro",
  admin: {
    group: "Homepage",
    description:
      "The heading above the row of category photos (Weddings, Portraits, etc.) on the homepage.",
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
