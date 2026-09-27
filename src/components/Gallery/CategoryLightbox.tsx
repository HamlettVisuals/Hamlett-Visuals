"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "./types";
import { DEFAULT_LOCATION, generateAltText } from "@/lib/generate-alt-text";

type CategoryLightboxProps = {
  /** Display name of the category this gallery belongs to, e.g. "Weddings". */
  category: string;
  events: { name: string; photos: GalleryPhoto[] }[];
  isOpen: boolean;
  /** Index into the flattened photo list across all events. */
  startIndex: number;
  onClose: () => void;
};

type FlatPhoto = {
  photo: GalleryPhoto;
  eventName: string;
  indexInEvent: number;
  totalInEvent: number;
};

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  const d = direction === "left" ? "M12 4 6 10l6 6" : "M8 4l6 6-6 6";
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Shown while the current photo loads: a softly pulsing panel the photo's
 * own shape, sized and centred the way the photo will be (an SVG's viewBox
 * scales like object-contain). Same pulse as the gallery skeleton.
 */
function LoadingPlaceholder({ photo }: { photo: GalleryPhoto }) {
  const width = photo.width || 4;
  const height = photo.height || 5;
  return (
    <div role="status" className="absolute inset-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" aria-hidden="true">
        <rect width={width} height={height} className="lightbox-loading fill-canvas/8" />
      </svg>
      <span className="sr-only">Loading photo</span>
    </div>
  );
}

export default function CategoryLightbox({
  category,
  events,
  isOpen,
  startIndex,
  onClose,
}: CategoryLightboxProps) {
  const flat = useMemo<FlatPhoto[]>(() => {
    const items: FlatPhoto[] = [];
    events.forEach((event) => {
      event.photos.forEach((photo, index) => {
        items.push({
          photo,
          eventName: event.name,
          indexInEvent: index,
          totalInEvent: event.photos.length,
        });
      });
    });
    return items;
  }, [events]);

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Photo URLs that have finished loading (shown, or preloaded as a
  // neighbour), so the loading placeholder only shows while one is on its way.
  const [loadedUrls, setLoadedUrls] = useState<ReadonlySet<string>>(() => new Set());
  const markLoaded = useCallback((url: string) => {
    setLoadedUrls((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  // Reset to the requested photo whenever the lightbox transitions from
  // closed to open — adjusted during render (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setCurrentIndex(startIndex);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight") {
        setCurrentIndex((i) => (i + 1) % flat.length);
      } else if (event.key === "ArrowLeft") {
        setCurrentIndex((i) => (i - 1 + flat.length) % flat.length);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flat.length, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    thumbRefs.current[currentIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [isOpen, currentIndex]);

  // The main image is the stored original (see below), up to ~2MB, so only
  // the photos either side of the current one are fetched ahead — never the
  // whole album. Their preload images are kept alive until they stop being
  // neighbours: the browser only hands a preloaded photo to the <img> while
  // something still holds it (Payload's file route sends no Cache-Control,
  // so the HTTP cache can't), otherwise the photo downloads twice.
  const preloads = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => {
    const kept = preloads.current;
    if (!isOpen || flat.length < 2) {
      kept.clear();
      return;
    }
    const neighbours = new Set(
      [currentIndex + 1, currentIndex - 1 + flat.length].map((i) => flat[i % flat.length].photo.url),
    );
    neighbours.delete(flat[currentIndex].photo.url);
    for (const url of kept.keys()) if (!neighbours.has(url)) kept.delete(url);
    for (const url of neighbours) {
      if (kept.has(url)) continue;
      const img = new window.Image();
      img.onload = () => markLoaded(url);
      img.src = url;
      kept.set(url, img);
    }
  }, [isOpen, currentIndex, flat, markLoaded]);

  const current = flat[currentIndex];

  if (!isOpen || !current) return null;

  const isLoaded = loadedUrls.has(current.photo.url);

  function goPrev() {
    setCurrentIndex((i) => (i - 1 + flat.length) % flat.length);
  }

  function goNext() {
    setCurrentIndex((i) => (i + 1) % flat.length);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/94"
      role="dialog"
      aria-modal="true"
      aria-label={`${current.eventName} photo viewer`}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[16px] font-medium text-canvas">
            {current.eventName}
          </span>
          <span className="text-caption text-canvas/60">
            {current.indexInEvent + 1} / {current.totalInEvent}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -my-3 flex min-h-11 cursor-pointer items-center px-2 py-3 text-body text-canvas/70 transition-opacity hover:opacity-100"
        >
          Close
        </button>
      </div>

      {/* The image wrapper renders before both chevrons so it never sits on
          top of them in paint order: it's a fixed-size stage box (up to
          max-w-5xl) regardless of the photo's own aspect ratio — object-contain
          only affects the <img> inside it — so below ~1110px viewport width
          there's no side gutter outside that box and it would otherwise cover
          the chevrons (all three are position:absolute/relative siblings with
          z-index:auto, so DOM order alone decides who's on top). */}
      <div className="relative flex flex-1 items-center justify-center px-4">
        <div
          key={current.photo.url}
          className="relative h-full max-h-[calc(100vh-150px)] w-full max-w-5xl"
          onClick={(event) => event.stopPropagation()}
        >
          {!isLoaded && <LoadingPlaceholder photo={current.photo} />}
          {/* The stored original, not a copy from Next's image optimizer: at
              lightbox size the optimizer's copy was often larger than the
              original and softer. Photos are capped at 3000px on upload
              (lib/photo-resize.ts). Hidden until loaded, then faded in. */}
          <Image
            src={current.photo.url}
            alt={
              current.photo.alt ||
              generateAltText({
                kind: "event",
                eventName: current.eventName,
                category,
                location: DEFAULT_LOCATION,
              })
            }
            fill
            unoptimized
            loading="eager"
            className={`object-contain ${isLoaded ? "lightbox-image-enter" : "opacity-0"}`}
            onLoad={() => markLoaded(current.photo.url)}
            // A photo that fails still stops the placeholder, leaving its alt text.
            onError={() => markLoaded(current.photo.url)}
          />
        </div>

        {flat.length > 1 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            aria-label="Previous photo"
            className="absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-canvas/16 bg-canvas/8 text-canvas opacity-70 transition duration-150 ease-standard hover:scale-105 hover:opacity-100"
          >
            <ChevronIcon direction="left" />
          </button>
        )}

        {flat.length > 1 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            aria-label="Next photo"
            className="absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-canvas/16 bg-canvas/8 text-canvas opacity-70 transition duration-150 ease-standard hover:scale-105 hover:opacity-100"
          >
            <ChevronIcon direction="right" />
          </button>
        )}
      </div>

      {/* Filmstrip intentionally spans every event in the category (the flat
          list built above), not just the current one — it's a way to browse
          across the whole category without leaving the lightbox. The counter
          in the header above, by contrast, shows position within the current
          event only (indexInEvent / totalInEvent). Seeing more thumbnails
          here than the header count implies is expected, not a bug. */}
      {flat.length > 1 && (
        <div
          className="no-scrollbar hidden gap-2 overflow-x-auto px-5 pb-5 sm:flex"
          onClick={(event) => event.stopPropagation()}
        >
          {flat.map((item, index) => (
            <button
              key={`${item.eventName}-${item.photo.filename}-${index}`}
              type="button"
              ref={(el) => {
                thumbRefs.current[index] = el;
              }}
              onClick={() => setCurrentIndex(index)}
              aria-label={`${item.eventName} photo ${item.indexInEvent + 1}`}
              className={`relative h-[68px] w-[52px] flex-none cursor-pointer overflow-hidden transition-opacity ${
                index === currentIndex
                  ? "opacity-100 outline outline-1 outline-offset-1 outline-canvas/60"
                  : "opacity-40 hover:opacity-70"
              }`}
            >
              <Image
                src={item.photo.url}
                alt=""
                fill
                sizes="52px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
