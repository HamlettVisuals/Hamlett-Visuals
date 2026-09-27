"use client";

import { useState } from "react";
import Image, { type ImageLoader } from "next/image";
import { HOVER_ZOOM, photoSizes, type FrameWidth } from "@/lib/image-sizes";

// TEMPORARY, dev only — see page.tsx. The tiles copy the gallery's
// (Gallery/EventRow.tsx): 4:5, 280px wide from 640px up, hover zoom.

export type ComparePhoto = {
  id: number;
  label: string;
  url: string;
  alt: string;
  width: number;
  height: number;
};

const FORMATS = ["avif", "webp"] as const;
type Format = (typeof FORMATS)[number];

const TILE_ASPECT = 4 / 5;
const TILE_WIDTHS: FrameWidth[] = [
  { media: "(min-width: 640px)", width: 280, unit: "px" },
  { width: 68, unit: "vw" },
];

const loaderFor =
  (format: Format): ImageLoader =>
  ({ src, width, quality }) =>
    `/dev/image-compare/img?fmt=${format}&w=${width}&q=${quality ?? 90}&url=${encodeURIComponent(src)}`;

export default function FormatComparison({ photos }: { photos: ComparePhoto[] }) {
  return (
    <div className="flex flex-col gap-10">
      {FORMATS.map((format) => (
        <section key={format}>
          <h2 className="font-display text-title font-medium text-ink">
            {format.toUpperCase()} · quality 90
          </h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {photos.map((photo) => (
              <Tile key={photo.id} photo={photo} format={format} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Tile({ photo, format }: { photo: ComparePhoto; format: Format }) {
  const [fetched, setFetched] = useState<string>("loading…");

  return (
    <figure className="w-[68vw] sm:w-[280px]">
      <div className="hover-zoom aspect-[4/5] w-full">
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          quality={90}
          loader={loaderFor(format)}
          sizes={photoSizes({
            photo,
            frameAspect: TILE_ASPECT,
            frameWidths: TILE_WIDTHS,
            zoom: HOVER_ZOOM,
          })}
          className="object-cover"
          onLoad={(event) => {
            const img = event.currentTarget;
            const width = new URL(img.currentSrc).searchParams.get("w");
            const entry = performance.getEntriesByName(img.currentSrc)[0] as
              | PerformanceResourceTiming
              | undefined;
            const kb = entry?.encodedBodySize ? `${Math.round(entry.encodedBodySize / 1024)} KB` : "size n/a";
            setFetched(`${width}w · ${kb}`);
          }}
        />
      </div>
      <figcaption className="mt-2 text-caption text-muted">
        <span className="text-ink">{photo.label}</span> · {format.toUpperCase()} ·{" "}
        {photo.width}×{photo.height}
        <br />
        fetched {fetched}
      </figcaption>
    </figure>
  );
}
