"use client";

import { useRef, useState } from "react";
import type { GalleryVideo } from "./types";
import HoverZoomImage from "@/components/HoverZoomImage";
import PlayIcon from "@/components/Backstage/PlayIcon";
import { HOVER_ZOOM, photoSizes } from "@/lib/image-sizes";

type AlbumVideoProps = {
  video: GalleryVideo;
  /** The album's name, for the play button's label when the video has no title. */
  albumName: string;
};

/** Tallest a portrait video is drawn, as a share of the screen's height. */
const MAX_HEIGHT_SVH = 80;

/**
 * One album video above the album's photos (EventRow): a large player in
 * the video's own shape, full width of the column (a portrait reel is
 * capped at 80% of the screen's height and centred instead).
 *
 * Until it's played, a button covers it: the poster, through the site's one
 * hover effect (HoverZoomImage), with a play mark. Pressing it starts the
 * video in the same gesture (phones only allow sound that way) and the
 * cover goes for good, so the zoom never applies to the playing video and
 * the browser's own controls take over.
 *
 * `preload="metadata"`: only the video's index is fetched with the page,
 * not the video. The file URL answers with a short-lived link straight to
 * R2 (payload.config.ts), so playing and seeking never go through the site.
 */
export default function AlbumVideo({ video, albumName }: AlbumVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const aspect = video.width && video.height ? video.width / video.height : 16 / 9;
  const label = video.title?.trim() || `Video from ${albumName}`;

  function play() {
    setStarted(true);
    void ref.current?.play().catch(() => {
      // Refused (rare, e.g. a power-saving mode): the controls are showing
      // now, so a second press on their own play button works.
    });
  }

  return (
    <figure className="m-0">
      {video.title?.trim() && <figcaption className="mb-2 text-body text-ink">{video.title.trim()}</figcaption>}
      <div
        className="relative mx-auto w-full overflow-hidden bg-ink"
        style={{ aspectRatio: aspect, maxWidth: `min(100%, calc(${MAX_HEIGHT_SVH}svh * ${aspect}))` }}
      >
        <video
          ref={ref}
          src={video.url}
          preload="metadata"
          playsInline
          controls={started}
          aria-label={label}
          className="absolute inset-0 h-full w-full"
        />
        {!started && (
          <button
            type="button"
            onClick={play}
            aria-label={`Play ${label}`}
            className="absolute inset-0 block h-full w-full cursor-pointer"
          >
            {video.poster ? (
              <HoverZoomImage
                src={video.poster.url}
                alt=""
                sizes={photoSizes({
                  photo: video.poster,
                  frameAspect: aspect,
                  frameWidths: [
                    { media: "(min-width: 56rem)", width: 896, unit: "px" },
                    { width: 100, unit: "vw" },
                  ],
                  zoom: HOVER_ZOOM,
                })}
                focal={video.poster}
                className="h-full w-full"
              />
            ) : null}
            {/* Backstage's play mark (BackstageGrid.tsx), sized up for a large player. */}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="flex size-14 items-center justify-center rounded-full bg-ink/55 text-canvas sm:size-16">
                <PlayIcon className="size-5 translate-x-0.5 sm:size-6" />
              </span>
            </span>
          </button>
        )}
      </div>
    </figure>
  );
}
