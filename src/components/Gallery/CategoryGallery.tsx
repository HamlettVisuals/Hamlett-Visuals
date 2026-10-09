"use client";

import { Suspense, useState } from "react";
import type { GalleryEvent, GalleryVideo } from "./types";
import LiveEventRow from "./LiveEventRow";
import CategoryLightbox from "./CategoryLightbox";
import GalleryEmptyState from "./GalleryEmptyState";
import GallerySkeleton from "./GallerySkeleton";
import PhotoGrid from "./PhotoGrid";
import DevGalleryStateParam, {
  type DevGalleryState,
} from "./DevGalleryStateParam";

type CategoryGalleryProps = {
  category: { name: string };
  events: GalleryEvent[];
};

/** Photo count used to demo the sparse-grid CSS via ?galleryState=sparse. */
const SPARSE_PREVIEW_PHOTO_COUNT = 2;

/**
 * ?galleryState=video (development only): a sample video on the first
 * album, with its first photo as the poster, to see the player without
 * uploading one. Nothing serves DEV_SAMPLE_VIDEO_URL; the e2e test
 * (tests/e2e/album-videos.test.cjs) answers it with a clip of its own.
 */
const DEV_SAMPLE_VIDEO_URL = "/dev-sample-video.mp4";
function withSampleVideo(events: GalleryEvent[]): GalleryEvent[] {
  if (!events.length) return events;
  const [first, ...rest] = events;
  const sample: GalleryVideo = {
    id: -1,
    url: DEV_SAMPLE_VIDEO_URL,
    title: "Highlight reel (sample)",
    width: 1280,
    height: 720,
    poster: first.photos[0] ?? null,
  };
  return [{ ...first, videos: [sample, ...first.videos] }, ...rest];
}

export default function CategoryGallery({
  category,
  events: savedEvents,
}: CategoryGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [devState, setDevState] = useState<DevGalleryState>(null);
  const events = devState === "video" ? withSampleVideo(savedEvents) : savedEvents;
  const showGallery = devState === null || devState === "video";

  function handlePhotoClick(eventIndex: number, photoIndex: number) {
    const precedingCount = events
      .slice(0, eventIndex)
      .reduce((sum, event) => sum + event.photos.length, 0);

    setLightboxStartIndex(precedingCount + photoIndex);
    setLightboxOpen(true);
  }

  const totalPhotos = events.reduce((sum, event) => sum + event.photos.length, 0);
  const totalVideos = events.reduce((sum, event) => sum + event.videos.length, 0);

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

      {showGallery && totalPhotos + totalVideos === 0 && <GalleryEmptyState />}

      {showGallery && totalPhotos + totalVideos > 0 && (
        <>
          <div
            className="flex flex-col gap-8"
            aria-label={`${category.name} gallery`}
          >
            {events.map((event, eventIndex) => (
              <LiveEventRow
                key={event.id}
                event={event}
                category={category.name}
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
