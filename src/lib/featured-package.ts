import type { Where } from "payload";
import type { PricingRow } from "#src/payload-types.ts";

// Which Pricing / Offer Rows the Featured Offer global can spotlight: not in
// the Trash, and in a category that's shown on the site and not in the Trash
// either (a hidden category's portfolio page 404s, so its "View gallery"
// link would too). One rule, three places:
//   - AVAILABLE_PACKAGE_WHERE: the dropdown's options
//     (components/admin/FeaturedPackageField.tsx) and the field's
//     filterOptions, which Payload also checks on save (globals/FeaturedOffer.ts).
//   - availablePackage(): the homepage (components/home/FeaturedOffer.tsx),
//     so a package that's become unavailable since it was picked hides the
//     section instead of showing broken links.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only — see the note at the top of that file.

export const AVAILABLE_PACKAGE_WHERE: Where = {
  and: [
    { deletedAt: { exists: false } },
    { "category.published": { equals: true } },
    { "category.deletedAt": { exists: false } },
  ],
};

// `featuredPackage` populated at depth 2 (the row, then its category). A
// bare id means it didn't populate, and Payload populates a trashed
// relation as null — both count as unavailable.
export function availablePackage(value: unknown): PricingRow | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as PricingRow;
  if (row.deletedAt) return null;
  const category = row.category;
  if (typeof category !== "object" || category === null) return null;
  if (!category.published || category.deletedAt) return null;
  return row;
}
