// object-position that centres a photo's focal point in its crop frame, as
// far as the crop allows. Used by the hero (components/home/Hero.tsx) and by
// the Photos editor's crop preview (components/admin/CropPreview.tsx), so the
// preview is the same calculation as the live page, not a copy of it.
//
// Pure CSS so it's right on first paint at any size: the frame must be a
// size container (container-type: size), so cqw/cqh are its width and
// height, and the object-cover image's rendered size is max(frame, frame
// scaled to the photo's aspect ratio). The offset is then clamped so the
// image never pulls away from an edge. Photos without stored dimensions fall
// back to the plain percentage (focal point in frame, just not centred). No
// focal point set means 50/50 — the centre, exactly as with no
// object-position at all.
//
// This is also the rule Payload uses when it cuts a cropped image size (the
// 400×400 thumbnail) around the focal point: centre it, then clamp to the
// edges (payload/dist/uploads/image-resizing/createImageSizes.js).
export type FocalPhoto = {
  focalX?: number | null;
  focalY?: number | null;
  width?: number | null;
  height?: number | null;
};

export function focalPosition(photo: FocalPhoto): string {
  const fx = (photo.focalX ?? 50) / 100;
  const fy = (photo.focalY ?? 50) / 100;
  // Centred (or never set): plain 50% 50%, the object-cover default. The
  // calc below centres too, but from the stored size, while the browser
  // draws the resized copy it was sent, whose height is rounded to a whole
  // pixel — enough to nudge a 52px thumbnail by half a pixel.
  if (fx === 0.5 && fy === 0.5) return "50% 50%";
  if (!photo.width || !photo.height) return `${fx * 100}% ${fy * 100}%`;
  const ratio = photo.width / photo.height;
  const renderedWidth = `max(100cqw, 100cqh * ${ratio})`;
  const renderedHeight = `max(100cqh, 100cqw / ${ratio})`;
  const x = `clamp(100cqw - ${renderedWidth}, 50cqw - ${fx} * ${renderedWidth}, 0px)`;
  const y = `clamp(100cqh - ${renderedHeight}, 50cqh - ${fy} * ${renderedHeight}, 0px)`;
  return `${x} ${y}`;
}
