"use client";

import { uploadFocal, uploadUrl, type BackstageItem } from "@/lib/backstage-items";
import HoverZoomImage from "@/components/HoverZoomImage";
import { serverURL } from "@/lib/server-url";
import { useScopedCollectionLivePreview } from "@/lib/use-scoped-collection-live-preview";
import PlayIcon from "./PlayIcon";

/** 2 columns mobile, 3 desktop — narrower than PhotoGrid's 2/3/4 track since
 * this feed has no per-event grouping to break up a wide row. */
const BACKSTAGE_GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6";

type BackstageGridProps = {
  items: BackstageItem[];
  onItemClick: (item: BackstageItem, opener: HTMLButtonElement) => void;
};

type LiveFields = {
  id: string;
  title?: string | null;
  caption?: string | null;
  poster?: unknown;
};

// The tile follows the Backstage editor's unsaved title, caption and
// thumbnail in Live Preview, but only when it's the item being edited
// (`?lpDoc=<id>`, see Backstage.ts livePreview.url and
// lib/use-scoped-collection-live-preview.ts). The file itself always comes
// from the server. A cleared title shows the saved one: the server fills a
// blank title in from the file name on save.
function useLiveItem(item: BackstageItem): BackstageItem {
  const { data } = useScopedCollectionLivePreview<LiveFields>({
    initialData: { id: item.id, title: item.title, caption: item.caption },
    serverURL,
    collectionSlug: "backstage",
    apiRoute: "/hv-studio/api",
    depth: 1,
  });
  const posterChanged = "poster" in data;
  return {
    ...item,
    title: data.title?.trim() || item.title,
    caption: data.caption,
    imageUrl: item.kind === "video" && posterChanged ? uploadUrl(data.poster) : item.imageUrl,
    imageFocal: item.kind === "video" && posterChanged ? uploadFocal(data.poster) : item.imageFocal,
  };
}

function Tile({ item }: { item: BackstageItem }) {
  return (
    <div className="relative">
      {item.imageUrl ? (
        <HoverZoomImage
          src={item.imageUrl}
          alt={item.title}
          sizes="(min-width: 640px) 31vw, 46vw"
          className="aspect-[3/4] w-full"
          focal={item.imageFocal ?? undefined}
        />
      ) : (
        // A video without a thumbnail: a plain tile rather than a broken image.
        <div className="aspect-[3/4] w-full bg-ink/10" role="img" aria-label={item.title} />
      )}
      {item.kind === "video" && <span className="sr-only">Video: </span>}
      {item.kind === "video" && (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/55 text-canvas">
            <PlayIcon className="h-3 w-3 translate-x-0.5" />
          </span>
        </span>
      )}
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

function GridItem({
  item: savedItem,
  onItemClick,
}: {
  item: BackstageItem;
  onItemClick: BackstageGridProps["onItemClick"];
}) {
  const item = useLiveItem(savedItem);
  return (
    <button
      id={`backstage-${item.id}`}
      type="button"
      onClick={(event) => onItemClick(savedItem, event.currentTarget)}
      className="cursor-pointer text-left"
    >
      <Tile item={item} />
      <Caption item={item} />
    </button>
  );
}

export default function BackstageGrid({
  items,
  onItemClick,
}: BackstageGridProps) {
  return (
    <div className={BACKSTAGE_GRID_CLASS} aria-label="Backstage feed">
      {items.map((item) => (
        <GridItem key={item.id} item={item} onItemClick={onItemClick} />
      ))}
    </div>
  );
}
