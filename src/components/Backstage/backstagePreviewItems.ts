import type { BackstageItem } from "@/lib/backstage-items";

/**
 * Dev-only fixture data for ?backstagePreview=1 (see
 * DevBackstagePreviewParam) — there's no real backstage content yet, so this
 * is what lets the grid and lightbox be checked in the browser against every
 * combination they need to handle: image vs. video, with/without a caption,
 * and a range of title lengths. Thumbnails/media borrow existing portfolio
 * placeholder photos; the "video" items point at a public sample clip purely
 * so playback can be exercised, since no real video asset exists yet.
 */
const SAMPLE_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export const PREVIEW_BACKSTAGE_ITEMS: BackstageItem[] = [
  {
    id: "preview-1",
    type: "image",
    mediaUrl: "/photos/Weddings/Priya and Daniel/photo-1.png",
    thumbnailUrl: "/photos/Weddings/Priya and Daniel/photo-1.png",
    title: "Golden hour, first look",
    caption:
      "Priya asked for one quiet minute before the ceremony started — this was it.",
    uploadedAt: "2026-09-14T18:30:00.000Z",
  },
  {
    id: "preview-2",
    type: "video",
    mediaUrl: SAMPLE_VIDEO_URL,
    thumbnailUrl: "/photos/Motorsports/Redline Racing Race Weekend/photo-1.png",
    title: "Pit lane, thirty seconds to green",
    caption:
      "A quick clip from the grid walk before Redline's race weekend kicked off.",
    uploadedAt: "2026-09-12T09:15:00.000Z",
  },
  {
    id: "preview-3",
    type: "image",
    mediaUrl: "/photos/Pets/Sam Reyes Pet Session/photo-2.png",
    thumbnailUrl: "/photos/Pets/Sam Reyes Pet Session/photo-2.png",
    title: "Studio setup",
    uploadedAt: "2026-09-10T14:00:00.000Z",
  },
  {
    id: "preview-4",
    type: "video",
    mediaUrl: SAMPLE_VIDEO_URL,
    thumbnailUrl: "/photos/Brands/Lena Fischer Brand Shoot/photo-3.png",
    title: "Reel wrap",
    uploadedAt: "2026-09-08T11:45:00.000Z",
  },
  {
    id: "preview-5",
    type: "image",
    mediaUrl: "/photos/Real Estate/Compass and Key Listing/photo-2.png",
    thumbnailUrl: "/photos/Real Estate/Compass and Key Listing/photo-2.png",
    title: "Between takes at the Compass & Key listing",
    caption:
      "Bouncing light off the hallway mirror to fill the front room without another stand — the kind of on-set problem-solving that never makes the final gallery but always makes the shoot better.",
    uploadedAt: "2026-09-05T16:20:00.000Z",
  },
  {
    id: "preview-6",
    type: "video",
    mediaUrl: SAMPLE_VIDEO_URL,
    thumbnailUrl: "/photos/Portraits/Marcus Bell Session/photo-1.png",
    title: "Marcus, between setups",
    caption: "Swapping backdrops mid-session.",
    uploadedAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "preview-7",
    type: "image",
    mediaUrl: "/photos/Weddings/The Alvarez Wedding/photo-2.png",
    thumbnailUrl: "/photos/Weddings/The Alvarez Wedding/photo-2.png",
    title: "Reception setup",
    uploadedAt: "2026-08-28T20:10:00.000Z",
  },
];
