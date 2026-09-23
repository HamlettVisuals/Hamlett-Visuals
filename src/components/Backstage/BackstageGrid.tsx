"use client";

import type { BackstageItem } from "@/lib/backstage-items";
import HoverZoomImage from "@/components/HoverZoomImage";
import PlayIcon from "./PlayIcon";
import InstagramIcon from "./InstagramIcon";

/** 2 columns mobile, 3 desktop — narrower than PhotoGrid's 2/3/4 track since
 * this feed has no per-event grouping to break up a wide row. */
const BACKSTAGE_GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6";

type BackstageGridProps = {
  items: BackstageItem[];
  onItemClick: (item: BackstageItem, opener: HTMLButtonElement) => void;
};

function Tile({ item }: { item: BackstageItem }) {
  return (
    <div className="relative">
      <HoverZoomImage
        src={item.thumbnailUrl}
        alt={item.title}
        sizes="(min-width: 640px) 31vw, 46vw"
        className="aspect-[3/4] w-full"
      />
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/55 text-canvas">
          {item.type === "video" ? (
            <PlayIcon className="h-3 w-3 translate-x-0.5" />
          ) : (
            <InstagramIcon className="h-3.5 w-3.5" />
          )}
        </span>
      </span>
    </div>
  );
}

function Caption({ item }: { item: BackstageItem }) {
  return (
    // Fixed-height slot (backstage-caption-slot, globals.css) so a missing
    // or one-line caption doesn't shrink the tile — every tile in a row
    // keeps the same total height and rows stay edge-to-edge, the way they
    // do in the plain gallery grid.
    <div className="backstage-caption-slot mt-3 flex flex-col">
      <p className="line-clamp-1 text-body font-medium text-ink">
        {item.title}
      </p>
      <p className="mt-1 line-clamp-2 text-caption text-muted">
        {item.caption}
      </p>
    </div>
  );
}

export default function BackstageGrid({
  items,
  onItemClick,
}: BackstageGridProps) {
  return (
    <div className={BACKSTAGE_GRID_CLASS} aria-label="Backstage feed">
      {items.map((item) =>
        // A Reel embed has nothing to play here — it links out to the real
        // post on Instagram (same convention as the homepage Instagram
        // section) instead of opening the lightbox.
        item.type === "reel_embed" ? (
          <a
            key={item.id}
            href={item.reelUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="text-left"
          >
            <Tile item={item} />
            <Caption item={item} />
          </a>
        ) : (
          <button
            key={item.id}
            type="button"
            onClick={(event) => onItemClick(item, event.currentTarget)}
            className="cursor-pointer text-left"
          >
            <Tile item={item} />
            <Caption item={item} />
          </button>
        ),
      )}
    </div>
  );
}
