import { GALLERY_ROW_CLASS, GALLERY_TILE_CLASS, tileStyle } from "./galleryRow";

type GallerySkeletonProps = {
  rows?: number;
};

/** A typical mix of shapes (width ÷ height) for the placeholder tiles. */
const PLACEHOLDER_ASPECTS = [2 / 3, 3 / 2, 4 / 5, 2 / 3, 3 / 2];

/**
 * Placeholder album rows shown while photos are being fetched. Uses
 * EventRow's row and tile sizing (galleryRow.ts), so the rows are the same
 * height and the real tiles swap in without the page jumping.
 */
export default function GallerySkeleton({ rows = 2 }: GallerySkeletonProps) {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={`overflow-hidden ${GALLERY_ROW_CLASS}`}>
          {PLACEHOLDER_ASPECTS.map((aspect, index) => (
            <div
              key={index}
              className={`gallery-skeleton-tile ${GALLERY_TILE_CLASS}`}
              style={tileStyle(aspect)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
