import { PHOTO_GRID_CLASS } from "./PhotoGrid";

type GallerySkeletonProps = {
  count?: number;
};

/**
 * Placeholder grid shown while photos are being fetched. Shares
 * PHOTO_GRID_CLASS with PhotoGrid so the real grid swaps in without reflow.
 */
export default function GallerySkeleton({ count = 8 }: GallerySkeletonProps) {
  return (
    <div className={PHOTO_GRID_CLASS} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="gallery-skeleton-tile aspect-[4/5] w-full" />
      ))}
    </div>
  );
}
