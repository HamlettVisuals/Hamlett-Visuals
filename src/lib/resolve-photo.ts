import type { Photo } from "@/payload-types";

// Shared narrowing helper for upload-relationship fields (Category.coverPhoto,
// Category.heroPhoto, etc.) — Payload's generated types
// always include the unpopulated (bare id) case alongside the populated
// object, since the type can't know the query's depth at the call site.
export function resolvePhoto(
  value: number | Photo | null | undefined,
): Photo | null {
  return typeof value === "object" && value !== null ? value : null;
}
