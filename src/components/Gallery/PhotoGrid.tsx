"use client";

import type { GalleryPhoto } from "./types";
import HoverZoomImage from "@/components/HoverZoomImage";
import { DEFAULT_LOCATION, generateAltText } from "@/lib/generate-alt-text";
import { HOVER_ZOOM, photoSizes, type FrameWidth } from "@/lib/image-sizes";
import { PHOTO_GRID_CLASS } from "./photoGridClass";

type PhotoGridProps = {
  photos: GalleryPhoto[];
  eventName: string;
  category: string;
  onPhotoClick?: (index: number) => void;
};

/** Each tile's frame: 4:5, one column of PHOTO_GRID_CLASS at each breakpoint. */
const TILE_ASPECT = 4 / 5;
const TILE_WIDTHS: FrameWidth[] = [
  { media: "(min-width: 1024px)", width: 208, unit: "px" },
  { media: "(min-width: 640px)", width: 30, unit: "vw" },
  { width: 45, unit: "vw" },
];

/**
 * Only reached today via CategoryGallery's dev-only ?galleryState=sparse
 * preview — a fetch wrapper composes this with GallerySkeleton/
 * GalleryEmptyState: show the skeleton while pending, the empty state when
 * the result is length 0, this grid otherwise — so this component only ever
 * renders a non-empty `photos` array.
 */
export default function PhotoGrid({
  photos,
  eventName,
  category,
  onPhotoClick,
}: PhotoGridProps) {
  return (
    <div className={PHOTO_GRID_CLASS}>
      {photos.map((photo, index) => (
        <button
          key={photo.filename}
          type="button"
          onClick={() => onPhotoClick?.(index)}
          className="cursor-pointer"
        >
          <HoverZoomImage
            src={photo.url}
            alt={
              photo.alt ||
              generateAltText({
                kind: "event",
                eventName,
                category,
                location: DEFAULT_LOCATION,
              })
            }
            sizes={photoSizes({
              photo,
              frameAspect: TILE_ASPECT,
              frameWidths: TILE_WIDTHS,
              zoom: HOVER_ZOOM,
            })}
            className="aspect-[4/5] w-full"
            focal={photo}
          />
        </button>
      ))}
    </div>
  );
}
