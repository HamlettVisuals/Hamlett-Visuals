"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/albums";

type CategoryLightboxProps = {
  events: { name: string; photos: Photo[] }[];
  isOpen: boolean;
  /** Index into the flattened photo list across all events. */
  startIndex: number;
  onClose: () => void;
};

type FlatPhoto = {
  photo: Photo;
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

export default function CategoryLightbox({
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

  const current = flat[currentIndex];

  if (!isOpen || !current) return null;

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
          className="lightbox-image-enter relative h-full max-h-[calc(100vh-150px)] w-full max-w-5xl"
          onClick={(event) => event.stopPropagation()}
        >
          <Image
            src={current.photo.url}
            alt={`${current.eventName} photo ${current.indexInEvent + 1}`}
            fill
            quality={95}
            sizes="90vw"
            className="object-contain"
            priority
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
