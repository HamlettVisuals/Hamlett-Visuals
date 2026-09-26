"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import type { BackstageItem } from "@/lib/backstage-items";
import PlayIcon from "./PlayIcon";
import SpeakerIcon from "./SpeakerIcon";

type BackstageLightboxProps = {
  items: BackstageItem[];
  isOpen: boolean;
  /** Index into `items`. */
  startIndex: number;
  onClose: () => void;
};

// Elements the Tab-trap cycles between — same convention as
// AskQuestionPanel's focus trap.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

// How much vertical space the header bar + title/caption block below the
// stage reserve — kept in sync with their own padding below. Used both by
// the plain-image fallback box and by the video aspect-ratio calc.
const STAGE_VERTICAL_BUDGET = "280px";

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
 * Backstage's own lightbox — same underlying mechanics as CategoryLightbox
 * (prev/next, Escape to close, a Tab focus trap, focus restored to the
 * opener on close) but a distinct, more editorial visual treatment: wider
 * margins around the stage, and the full title/caption set below the media
 * rather than a compact header bar. It steps through photos and videos
 * alike. A photo shows as an image. A video sits on its thumbnail with a
 * large centered play button, plays in place (never the phone's full-screen
 * player: `playsInline`), and gets its own minimal controls (seek bar +
 * mute) instead of the browser's native <video controls> UI.
 *
 * Playback only ever starts from a tap on play, and play() is called inside
 * that tap itself: iPhone Safari only lets a video start with its sound on
 * from a direct user gesture, so starting it after a re-render (an
 * `autoPlay` attribute on a newly mounted element) could be blocked there.
 */
export default function BackstageLightbox({
  items,
  isOpen,
  startIndex,
  onClose,
}: BackstageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  // Once a video has started, its seek bar and mute button stay up while
  // it's paused; before that only the play button shows.
  const [hasStarted, setHasStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  // The video's natural width/height ratio — drives the stage box's size
  // (see mediaBoxStyle) so it renders edge-to-edge with no letterboxing, the
  // same way object-contain already does for a photo filling its own fixed
  // box.
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function resetMedia() {
    setIsPlaying(false);
    setHasStarted(false);
    setAspectRatio(null);
    setDuration(0);
    setCurrentTime(0);
  }

  // Reset to the requested item whenever the lightbox transitions from
  // closed to open — adjusted during render (not an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setCurrentIndex(startIndex);
      resetMedia();
    }
  }

  // Never carry a playing video (or its previous item's aspect ratio/seek
  // position) across a prev/next navigation — every item that comes into
  // view opens fresh, on its thumbnail. The stage is keyed by item, so the
  // old <video> is unmounted, and stops, with it.
  const [indexAtLastRender, setIndexAtLastRender] = useState(currentIndex);
  if (currentIndex !== indexAtLastRender) {
    setIndexAtLastRender(currentIndex);
    resetMedia();
  }

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        setCurrentIndex((i) => (i + 1) % items.length);
        return;
      }
      if (event.key === "ArrowLeft") {
        setCurrentIndex((i) => (i - 1 + items.length) % items.length);
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, items.length, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [isOpen]);

  // Keep the element's actual mute state in sync with the toggle — a video
  // element's `muted` property isn't reliably settable as a plain React prop.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, currentIndex, isOpen]);

  const current = items[currentIndex];

  if (!isOpen || !current) return null;

  function goPrev() {
    setCurrentIndex((i) => (i - 1 + items.length) % items.length);
  }

  function goNext() {
    setCurrentIndex((i) => (i + 1) % items.length);
  }

  // Called straight from the click/tap handlers (see the note above).
  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }

  // Sizes the stage box to the video's own aspect ratio (once known) so it
  // fills that box edge-to-edge — the largest box of that ratio that still
  // fits the available width (min(100%, 56rem), matching the photo stage's
  // max-w-4xl) and height (100vh minus the header/caption budget). Left
  // undefined until the ratio is known, or for a photo, so that path keeps
  // its fixed max-w-4xl/object-contain box.
  const mediaBoxStyle: CSSProperties | undefined =
    current.kind === "video" && aspectRatio
      ? {
          aspectRatio: `${aspectRatio}`,
          width: `min(min(100%, 56rem), calc((100vh - ${STAGE_VERTICAL_BUDGET}) * ${aspectRatio}))`,
          height: "auto",
        }
      : undefined;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink/95"
      role="dialog"
      aria-modal="true"
      aria-label={`${current.title} viewer`}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-6 py-6 sm:px-12 sm:py-8"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="text-caption text-canvas/60">
          {currentIndex + 1} / {items.length}
        </span>
        <button
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          className="-mr-2 -my-3 flex min-h-11 cursor-pointer items-center px-2 py-3 text-body text-canvas/70 transition-opacity hover:opacity-100"
        >
          Close
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-6 sm:px-20">
        <div
          key={current.id}
          className="lightbox-image-enter relative h-full max-h-[calc(100vh-280px)] w-full max-w-4xl"
          style={mediaBoxStyle}
          onClick={(event) => event.stopPropagation()}
        >
          {current.kind === "video" ? (
            <>
              <video
                ref={videoRef}
                // A video with no thumbnail opens a moment in, so there's a
                // frame to show rather than a black box (iPhone Safari
                // doesn't draw one from the metadata alone).
                src={
                  current.mediaUrl
                    ? `${current.mediaUrl}${current.imageUrl ? "" : "#t=0.1"}`
                    : undefined
                }
                poster={current.imageUrl ?? undefined}
                playsInline
                preload="metadata"
                muted={muted}
                onClick={togglePlayback}
                onPlay={() => {
                  setIsPlaying(true);
                  setHasStarted(true);
                }}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  setDuration(video.duration);
                  if (video.videoWidth && video.videoHeight) {
                    setAspectRatio(video.videoWidth / video.videoHeight);
                  }
                }}
                onTimeUpdate={(event) =>
                  setCurrentTime(event.currentTarget.currentTime)
                }
                className="absolute inset-0 h-full w-full cursor-pointer object-contain"
              />

              {hasStarted && (
                <>
                  {/* Subtle legibility gradient sized to the seek bar only —
                      not a full dark control strip. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-ink/45 to-transparent"
                  />

                  <input
                    type="range"
                    aria-label="Seek"
                    min={0}
                    max={duration || 0}
                    step={0.01}
                    value={currentTime}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setCurrentTime(value);
                      if (videoRef.current) videoRef.current.currentTime = value;
                    }}
                    onClick={(event) => event.stopPropagation()}
                    style={{ ["--progress" as string]: `${progressPercent}%` }}
                    className="video-progress absolute inset-x-0 bottom-0 z-10"
                  />

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMuted((value) => !value);
                    }}
                    aria-label={muted ? "Unmute" : "Mute"}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-ink/55 text-canvas transition hover:bg-ink/70"
                  >
                    <SpeakerIcon muted={muted} className="h-4 w-4" />
                  </button>
                </>
              )}

              {!isPlaying && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePlayback();
                  }}
                  aria-label={hasStarted ? "Resume video" : "Play video"}
                  className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-ink/55 text-canvas transition duration-150 ease-standard hover:scale-105 hover:bg-ink/70"
                >
                  <PlayIcon className="h-6 w-6 translate-x-0.5" />
                </button>
              )}
            </>
          ) : current.imageUrl ? (
            <Image
              src={current.imageUrl}
              alt={current.title}
              fill
              quality={95}
              sizes="90vw"
              className="object-contain"
              priority
            />
          ) : null}
        </div>

        {items.length > 1 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            aria-label="Previous item"
            className="absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-canvas/16 bg-canvas/8 text-canvas opacity-70 transition duration-150 ease-standard hover:scale-105 hover:opacity-100 sm:left-10"
          >
            <ChevronIcon direction="left" />
          </button>
        )}

        {items.length > 1 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            aria-label="Next item"
            className="absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-canvas/16 bg-canvas/8 text-canvas opacity-70 transition duration-150 ease-standard hover:scale-105 hover:opacity-100 sm:right-10"
          >
            <ChevronIcon direction="right" />
          </button>
        )}
      </div>

      <div
        className="mx-auto w-full max-w-2xl px-6 pb-12 pt-2 text-center sm:pb-20"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-display text-title text-canvas">
          {current.title}
        </h2>
        {current.caption && (
          <p className="mt-3 text-body text-canvas/70">{current.caption}</p>
        )}
      </div>
    </div>
  );
}
