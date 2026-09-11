"use client";

import { useEffect, useRef, useState } from "react";
import type { Photo } from "@/lib/albums";
import HoverZoomImage from "@/components/HoverZoomImage";

type EventRowProps = {
  name: string;
  /**
   * Stable slug (from `slugify()` in `@/lib/albums`), set as this row's `id`
   * so it can be deep-linked as /portfolio/[category]#[slug] — from
   * /testimonials, for one. `scroll-padding-top` on `html` (globals.css)
   * keeps the sticky header clear of the target on both same-page jumps and a
   * fresh page load with the hash already in the URL.
   */
  slug: string;
  photos: Photo[];
  /** Suppresses the hairline top border for the first row on the page. */
  isFirst?: boolean;
  /** Index of the clicked photo within this event's own photos array. */
  onPhotoClick: (index: number) => void;
};

/** Net pointer movement below this, in px, still counts as a click rather than a drag. */
const DRAG_CLICK_THRESHOLD = 5;
/** Floor on the custom scrollbar thumb so it stays grabbable on very long rows. */
const MIN_THUMB_WIDTH = 32;

type ThumbMetrics = {
  width: number;
  left: number;
  scrollable: boolean;
};

export default function EventRow({
  name,
  slug,
  photos,
  isFirst = false,
  onPhotoClick,
}: EventRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isThumbDragging, setIsThumbDragging] = useState(false);
  const [thumb, setThumb] = useState<ThumbMetrics>({
    width: 0,
    left: 0,
    scrollable: false,
  });

  const isPointerDownRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const draggedRef = useRef(false);

  const thumbWidthRef = useRef(0);
  const thumbDragStartXRef = useRef(0);
  const thumbDragStartScrollLeftRef = useRef(0);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    // Measured off the row itself, not the track: the track only renders
    // once we know the row overflows, so it can't be the thing that tells
    // us whether it overflows. The track is a plain full-width sibling of
    // the row, so its width always matches row.clientWidth anyway.
    function recalcThumb() {
      if (!row) return;
      const { scrollWidth, clientWidth, scrollLeft } = row;

      if (scrollWidth <= clientWidth + 1) {
        thumbWidthRef.current = 0;
        setThumb({ width: 0, left: 0, scrollable: false });
        return;
      }

      const trackWidth = clientWidth;
      const width = Math.max(
        (clientWidth / scrollWidth) * trackWidth,
        MIN_THUMB_WIDTH,
      );
      const maxThumbLeft = trackWidth - width;
      const maxScrollLeft = scrollWidth - clientWidth;
      const left =
        maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * maxThumbLeft : 0;

      thumbWidthRef.current = width;
      setThumb({ width, left, scrollable: true });
    }

    recalcThumb();

    const observer = new ResizeObserver(recalcThumb);
    observer.observe(row);
    row.addEventListener("scroll", recalcThumb);
    return () => {
      observer.disconnect();
      row.removeEventListener("scroll", recalcThumb);
    };
  }, [photos.length]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    // Attached as a native listener with { passive: false } rather than
    // React's onWheel: React binds wheel handlers passively, which silently
    // no-ops preventDefault and lets the page scroll vertically instead of
    // the row scrolling horizontally.
    function handleWheel(event: WheelEvent) {
      if (!row) return;
      if (row.scrollWidth <= row.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      event.preventDefault();
      row.scrollLeft += event.deltaY;
    }

    row.addEventListener("wheel", handleWheel, { passive: false });
    return () => row.removeEventListener("wheel", handleWheel);
  }, []);

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    const row = rowRef.current;
    if (!row) return;
    isPointerDownRef.current = true;
    draggedRef.current = false;
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = row.scrollLeft;
    setIsDragging(true);
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!isPointerDownRef.current) return;
    const row = rowRef.current;
    if (!row) return;

    const delta = event.clientX - dragStartXRef.current;
    if (Math.abs(delta) > DRAG_CLICK_THRESHOLD) draggedRef.current = true;
    row.scrollLeft = dragStartScrollLeftRef.current - delta;
    // Stop the browser from starting a native image/text drag mid-gesture.
    event.preventDefault();
  }

  function stopDragging() {
    isPointerDownRef.current = false;
    setIsDragging(false);
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (draggedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      draggedRef.current = false;
    }
  }

  function handleThumbMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    const row = rowRef.current;
    if (!row) return;
    event.stopPropagation();
    event.preventDefault();
    thumbDragStartXRef.current = event.clientX;
    thumbDragStartScrollLeftRef.current = row.scrollLeft;
    setIsThumbDragging(true);
  }

  // Tracked on window (not the thin track element) so a fast drag doesn't
  // outrun the pointer and prematurely end the gesture.
  useEffect(() => {
    if (!isThumbDragging) return;

    function handleMove(event: MouseEvent) {
      const row = rowRef.current;
      const track = trackRef.current;
      if (!row || !track) return;

      const maxThumbLeft = track.clientWidth - thumbWidthRef.current;
      if (maxThumbLeft <= 0) return;

      const maxScrollLeft = row.scrollWidth - row.clientWidth;
      const deltaX = event.clientX - thumbDragStartXRef.current;
      const scrollDelta = (deltaX / maxThumbLeft) * maxScrollLeft;
      row.scrollLeft = thumbDragStartScrollLeftRef.current + scrollDelta;
    }

    function handleUp() {
      setIsThumbDragging(false);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isThumbDragging]);

  function handleTrackClick(event: React.MouseEvent<HTMLDivElement>) {
    // Ignore clicks that bubbled up from the thumb itself — only a click on
    // bare track jumps the scroll position.
    if (event.target !== trackRef.current) return;

    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return;

    const rect = track.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const maxThumbLeft = rect.width - thumbWidthRef.current;
    const targetLeft = Math.min(
      Math.max(clickX - thumbWidthRef.current / 2, 0),
      maxThumbLeft,
    );
    const maxScrollLeft = row.scrollWidth - row.clientWidth;

    row.scrollLeft =
      maxThumbLeft > 0 ? (targetLeft / maxThumbLeft) * maxScrollLeft : 0;
  }

  return (
    <div id={slug}>
      <div
        className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 ${
          isFirst ? "" : "border-t border-hairline pt-6"
        }`}
      >
        <h2 className="min-w-0 font-display text-[19px] font-medium text-ink">
          {name}
        </h2>
        <span className="text-caption text-muted">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </span>
      </div>

      <div className="mt-4">
        <div
          ref={rowRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onClickCapture={handleClickCapture}
          onDragStart={(event) => event.preventDefault()}
          className={`no-scrollbar flex gap-1 overflow-x-auto ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {photos.map((photo, index) => (
            <button
              key={photo.filename}
              type="button"
              onClick={() => onPhotoClick(index)}
              className={`flex-none ${
                isDragging ? "cursor-grabbing" : "cursor-pointer"
              }`}
            >
              <HoverZoomImage
                src={photo.url}
                alt={`${name} photo ${index + 1}`}
                sizes="(max-width: 640px) 68vw, 280px"
                className="aspect-[3/4] w-[68vw] sm:w-[280px]"
              />
            </button>
          ))}
        </div>

        {thumb.scrollable && (
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="relative mt-3 h-1.5 w-full cursor-pointer rounded-sm bg-hairline"
          >
            <div
              onMouseDown={handleThumbMouseDown}
              className={`absolute inset-y-0 rounded-sm ${
                isThumbDragging
                  ? "cursor-grabbing bg-ink"
                  : "cursor-grab bg-muted hover:bg-ink"
              }`}
              style={{ width: thumb.width, left: thumb.left }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
