"use client";

import { useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/albums";
import Lightbox from "./Lightbox";

type PhotoGridProps = {
  photos: Photo[];
  eventName: string;
};

export default function PhotoGrid({ photos, eventName }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <button
            key={photo.filename}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800"
          >
            <Image
              src={photo.url}
              alt={`${eventName} photo ${index + 1}`}
              fill
              quality={90}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          eventName={eventName}
          onClose={() => setLightboxIndex(null)}
          onNext={() =>
            setLightboxIndex((current) =>
              current === null ? null : (current + 1) % photos.length,
            )
          }
          onPrev={() =>
            setLightboxIndex((current) =>
              current === null
                ? null
                : (current - 1 + photos.length) % photos.length,
            )
          }
        />
      )}
    </>
  );
}
