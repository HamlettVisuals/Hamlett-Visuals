// Shared shape for the Backstage grid/lightbox — decoupled from Payload's
// generated `Backstage` type the same way Gallery/types.ts's GalleryPhoto is
// decoupled from `Photo`/`Event`: by the time data reaches these components
// it's already been fetched and mapped (see (site)/backstage/page.tsx).
export type BackstageItem = {
  id: string;
  type: "video" | "reel_embed";
  /** The playable video file's URL. Only set when `type` is "video". */
  mediaUrl: string | null;
  /** Grid tile image — a poster frame for a video, a preview image for a Reel. */
  thumbnailUrl: string;
  /** The Reel's Instagram permalink. Only set when `type` is "reel_embed". */
  reelUrl: string | null;
  title: string;
  caption?: string | null;
};
