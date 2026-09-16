"use client";

import type { Photo } from "@/lib/albums";
import HoverZoomImage from "@/components/HoverZoomImage";
import { DEFAULT_LOCATION, generateAltText } from "@/lib/generate-alt-text";
import { PHOTO_GRID_CLASS } from "./photoGridClass";

export { PHOTO_GRID_CLASS };

type PhotoGridProps = {
  photos: Photo[];
  eventName: string;
  category: string;
  onPhotoClick?: (index: number) => void;
};

/**
 * Wrapping photo grid for the future admin-driven data model, where photos
 * arrive from an async fetch instead of the static folder scan. A fetch
 * wrapper composes this with GallerySkeleton/GalleryEmptyState: show the
 * skeleton while pending, the empty state when the result is length 0, this
 * grid otherwise — so this component only ever renders a non-empty `photos`
 * array.
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
            alt={generateAltText({
              kind: "event",
              eventName,
              category,
              location: DEFAULT_LOCATION,
            })}
            sizes="(min-width: 1024px) 208px, (min-width: 640px) 30vw, 45vw"
            className="aspect-[3/4] w-full"
          />
        </button>
      ))}
    </div>
  );
}
