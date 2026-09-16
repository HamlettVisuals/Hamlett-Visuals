"use client";

import { Suspense, useState } from "react";
import type { Category } from "@/lib/categories";
import type { Event } from "@/lib/albums";
import EventRow from "./EventRow";
import CategoryLightbox from "./CategoryLightbox";
import GalleryEmptyState from "./GalleryEmptyState";
import GallerySkeleton from "./GallerySkeleton";
import PhotoGrid from "./PhotoGrid";
import DevGalleryStateParam, {
  type DevGalleryState,
} from "./DevGalleryStateParam";

type CategoryGalleryProps = {
  category: Category;
  events: Event[];
};

/** Photo count used to demo the sparse-grid CSS via ?galleryState=sparse. */
const SPARSE_PREVIEW_PHOTO_COUNT = 2;

export default function CategoryGallery({
  category,
  events,
}: CategoryGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [devState, setDevState] = useState<DevGalleryState>(null);

  function handlePhotoClick(eventIndex: number, photoIndex: number) {
    const precedingCount = events
      .slice(0, eventIndex)
      .reduce((sum, event) => sum + event.photos.length, 0);

    setLightboxStartIndex(precedingCount + photoIndex);
    setLightboxOpen(true);
  }

  const totalPhotos = events.reduce((sum, event) => sum + event.photos.length, 0);

  return (
    <>
      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <DevGalleryStateParam onChange={setDevState} />
        </Suspense>
      )}

      {devState === "loading" && <GallerySkeleton />}

      {devState === "empty" && <GalleryEmptyState />}

      {devState === "sparse" && (
        <PhotoGrid
          photos={events
            .flatMap((event) => event.photos)
            .slice(0, SPARSE_PREVIEW_PHOTO_COUNT)}
          eventName={events[0]?.name ?? category.name}
          category={category.name}
        />
      )}

      {devState === null && totalPhotos === 0 && <GalleryEmptyState />}

      {devState === null && totalPhotos > 0 && (
        <>
          <div
            className="flex flex-col gap-8"
            aria-label={`${category.name} gallery`}
          >
            {events.map((event, eventIndex) => (
              <EventRow
                key={event.slug}
                name={event.name}
                category={category.name}
                slug={event.slug}
                photos={event.photos}
                isFirst={eventIndex === 0}
                onPhotoClick={(photoIndex) =>
                  handlePhotoClick(eventIndex, photoIndex)
                }
              />
            ))}
          </div>

          <CategoryLightbox
            category={category.name}
            events={events}
            isOpen={lightboxOpen}
            startIndex={lightboxStartIndex}
            onClose={() => setLightboxOpen(false)}
          />
        </>
      )}
    </>
  );
}
