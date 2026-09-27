// Builds a per-photo `sizes` string for next/image in a fixed crop frame
// (HoverZoomImage's object-cover). `sizes` tells the browser how wide the
// image is drawn, and it picks a file from the srcset on that alone. With
// object-cover the image is drawn wider than its frame whenever the photo is
// wider than the frame (a landscape in a portrait tile), so the frame's own
// width under-asks and the photo is stretched — the softness found in
// docs/image-audit.md. Here each breakpoint's width is scaled up by how much
// wider than the frame the photo is drawn, and by the hover zoom:
//
//   drawn width = frame width × max(1, photo aspect / frame aspect) × zoom
//
// rounded up to a whole px (or vw). A photo narrower than the frame fills
// its width exactly, so it's never scaled down. With no stored size (an old
// upload), the frame's own width is used, as before.

/** Scale of the .hover-zoom bulge — keep in sync with --zoom-scale in globals.css. */
export const HOVER_ZOOM = 1.06;

export type FrameWidth = {
  /** Media condition, e.g. "(min-width: 640px)". Leave off the last (fallback) entry. */
  media?: string;
  width: number;
  unit: "px" | "vw";
};

export function photoSizes({
  photo,
  frameAspect,
  frameWidths,
  zoom = 1,
}: {
  /** The photo's stored pixel size. */
  photo: { width?: number | null; height?: number | null };
  /** Frame width ÷ height, e.g. 4 / 5. */
  frameAspect: number;
  /** The frame's CSS width at each breakpoint, in `sizes` order (first match wins). */
  frameWidths: FrameWidth[];
  /** Hover-zoom factor where the bulge applies, e.g. HOVER_ZOOM. */
  zoom?: number;
}): string {
  const photoAspect = photo.width && photo.height ? photo.width / photo.height : frameAspect;
  const scale = Math.max(1, photoAspect / frameAspect) * zoom;
  return frameWidths
    .map(({ media, width, unit }) => {
      // The epsilon keeps float noise (e.g. 280 × 1.25 = 350.00000000000006) from rounding up a whole unit.
      const drawn = `${Math.ceil(width * scale - 1e-9)}${unit}`;
      return media ? `${media} ${drawn}` : drawn;
    })
    .join(", ");
}
