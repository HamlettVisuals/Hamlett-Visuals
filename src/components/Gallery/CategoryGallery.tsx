"use client";

import { useState } from "react";
import type { Category } from "@/lib/categories";
import type { Event } from "@/lib/albums";
import EventRow from "./EventRow";
import CategoryLightbox from "./CategoryLightbox";

type CategoryGalleryProps = {
  category: Category;
  events: Event[];
};

export default function CategoryGallery({
  category,
  events,
}: CategoryGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);

  function handlePhotoClick(eventIndex: number, photoIndex: number) {
    const precedingCount = events
      .slice(0, eventIndex)
      .reduce((sum, event) => sum + event.photos.length, 0);

    setLightboxStartIndex(precedingCount + photoIndex);
    setLightboxOpen(true);
  }

  return (
    <>
      <div
        className="flex flex-col gap-8"
        aria-label={`${category.name} gallery`}
      >
        {events.map((event, eventIndex) => (
          <EventRow
            key={event.slug}
            name={event.name}
            photos={event.photos}
            isFirst={eventIndex === 0}
            onPhotoClick={(photoIndex) =>
              handlePhotoClick(eventIndex, photoIndex)
            }
          />
        ))}
      </div>

      <CategoryLightbox
        events={events}
        isOpen={lightboxOpen}
        startIndex={lightboxStartIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
