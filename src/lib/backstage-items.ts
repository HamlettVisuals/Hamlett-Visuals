export type BackstageItem = {
  id: string;
  type: "image" | "video";
  /** Full-size image, or the playable video file. */
  mediaUrl: string;
  /** Grid tile image — for a video this is a poster frame. */
  thumbnailUrl: string;
  title: string;
  caption?: string;
  /** ISO date string — the feed sorts newest-first by this field. */
  uploadedAt: string;
};

// No admin-uploaded content yet — populated once the upload flow ships.
export const backstageItems: BackstageItem[] = [];
