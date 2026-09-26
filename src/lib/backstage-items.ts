// Shared shape for the Backstage grid/lightbox — decoupled from Payload's
// generated `Backstage` type the same way Gallery/types.ts's GalleryPhoto is
// decoupled from `Photo`/`Event`: by the time data reaches these components
// it's already been fetched and mapped (see (site)/backstage/page.tsx).
export type BackstageItem = {
  id: string;
  kind: "video" | "photo";
  /** The playable video file. Only set for a video. */
  mediaUrl: string | null;
  /**
   * The tile image: the photo itself, or a video's thumbnail. Null for a
   * video whose thumbnail couldn't be made; the tile is then plain.
   */
  imageUrl: string | null;
  title: string;
  caption?: string | null;
};

// A populated upload relation (the video's `poster`) or the photo's own
// file, down to a URL.
export function uploadUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const url = (value as { url?: unknown }).url;
  return typeof url === "string" && url ? url : null;
}
