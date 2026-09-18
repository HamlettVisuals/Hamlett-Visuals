import type { Category, PricingRow } from "@/payload-types";

// Small shared helpers for rendering a PricingRow doc — used by both
// FeaturedOffer.tsx (the single featured row) and Offers.tsx (every row).
// `category`/`gallery` are relationship fields that come back populated
// (full objects) at the depth page.tsx fetches with, but the generated type
// always includes the unpopulated (bare id) case too, so callers need to
// narrow before reading fields off them.

export function resolveCategory(
  category: PricingRow["category"],
): Category | null {
  return typeof category === "object" && category !== null ? category : null;
}

export function resolveGalleryLabels(gallery: PricingRow["gallery"]): string[] {
  if (!gallery) return [];
  return gallery
    .filter((photo) => typeof photo === "object" && photo !== null)
    .map((photo) => photo.alt);
}
