// Shared shape for the gallery components. This is deliberately its own
// small type, not payload-types' Event/Photo directly: by the time data
// reaches these components it's already been fetched and grouped (see
// /portfolio/[category]/page.tsx), and staying decoupled from the Payload
// shape keeps the dev-only empty/loading/sparse previews (DevGalleryStateParam)
// trivial to construct without a live document id.

export type GalleryPhoto = {
  filename: string;
  url: string;
  alt?: string | null;
  /** Stored pixel size — sizes the srcset request (lib/image-sizes.ts). */
  width?: number | null;
  height?: number | null;
  /** Focal point, for cropped frames (lib/focal-position.ts). */
  focalX?: number | null;
  focalY?: number | null;
};

export type GalleryEvent = {
  /** The album's id, so Live Preview can follow the one being edited. */
  id: number;
  slug: string;
  name: string;
  /** Optional short description, shown under the title when set. */
  description?: string | null;
  /** Optional shoot date (ISO); its month and year show when set. */
  date?: string | null;
  photos: GalleryPhoto[];
  /** Walkthroughs and highlight reels, shown above the photos (AlbumVideo). */
  videos: GalleryVideo[];
};

export type GalleryVideo = {
  id: number;
  /** The file's own URL; it answers with a short-lived link to R2. */
  url: string;
  title?: string | null;
  /** Upright pixel size, so the player has the video's shape before it loads. */
  width?: number | null;
  height?: number | null;
  /** Her chosen poster, else the frame made from the video; null if neither. */
  poster: GalleryPhoto | null;
};
