import type { Category, PricingRow } from "@/payload-types";

// Small shared helpers for rendering a Package (PricingRow doc) — used by
// page.tsx, FeaturedOffer.tsx (the single featured package) and Offers.tsx
// (every package). `category`/`album` are relationship fields that come
// back populated (full objects) at the depth page.tsx fetches with, but the
// generated type always includes the unpopulated (bare id) case too, so
// callers need to narrow before reading fields off them.

export function resolveCategory(
  category: PricingRow["category"],
): Category | null {
  return typeof category === "object" && category !== null ? category : null;
}

/** One of a package's sample photos, as the spotlight shows it. */
export type SamplePhoto = {
  id: number;
  url: string;
  alt: string;
  /** Focal point and stored size, for the crop (lib/focal-position.ts). */
  focalX?: number | null;
  focalY?: number | null;
  width?: number | null;
  height?: number | null;
};

/** Sample photos per package id, filled in by page.tsx. */
export type SamplePhotosByPackage = Record<number, SamplePhoto[]>;

// The package's album, if its photos may be shown: populated (a trashed
// album populates as null), live, and in the package's own category (the
// editor refuses anything else on save, but the album can be hidden or
// moved afterwards).
export function sampleAlbumId(row: PricingRow): number | null {
  const album = row.album;
  if (typeof album !== "object" || album === null) return null;
  if (!album.published || album.deletedAt) return null;
  const albumCategory = typeof album.category === "object" ? album.category?.id : album.category;
  if (albumCategory !== resolveCategory(row.category)?.id) return null;
  return album.id;
}
