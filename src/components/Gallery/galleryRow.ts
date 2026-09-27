import type { CSSProperties } from "react";
import { HOVER_ZOOM, frameSizes } from "@/lib/image-sizes";

/**
 * Sizing for an album row's tiles (EventRow), shared with GallerySkeleton so
 * the placeholder rows are the same height. Every tile keeps its photo's own
 * shape — nothing is cropped: the row has one height, and each tile is that
 * height × its photo's aspect ratio (--tile-aspect, set per tile).
 *
 * - From 640px (Tailwind's sm) up: rows are 350px tall.
 * - Below that: tiles are 85vw tall, but none is wider than 78vw, so a
 *   landscape never fills the screen and the next photo still peeks in. A
 *   tile that hits the cap shrinks to fit (still uncropped). Each row is as
 *   tall as its tallest tile, so an all-landscape row is shorter rather than
 *   leaving empty bands, and shorter tiles sit centred in the row.
 *
 * The class strings are written out in full (not built from the numbers
 * below) so Tailwind can find them; keep the two in sync.
 *
 * Lives in its own plain module (no "use client"), like photoGridClass.ts.
 */
const ROW_HEIGHT_PX = 350;
const PHONE_TILE_HEIGHT_VW = 85;
const PHONE_MAX_TILE_WIDTH_VW = 78;

export const GALLERY_ROW_CLASS = "flex items-center gap-1 sm:h-[350px]";

export const GALLERY_TILE_CLASS =
  "flex-none aspect-(--tile-aspect) w-[min(calc(85vw*var(--tile-aspect)),78vw)] sm:w-[calc(350px*var(--tile-aspect))]";

/** A photo's width ÷ height, or 4:5 for an old upload with no stored size. */
export function tileAspect(photo: { width?: number | null; height?: number | null }): number {
  return photo.width && photo.height ? photo.width / photo.height : 4 / 5;
}

/** Sets --tile-aspect on a tile (GALLERY_TILE_CLASS reads it). */
export function tileStyle(aspect: number): CSSProperties {
  return { "--tile-aspect": aspect } as CSSProperties;
}

/**
 * The tile's `sizes`: it's drawn exactly at its frame size, so that's its own
 * width (the 350px row's, or the phone tile's capped at 78vw), with the hover
 * zoom on top.
 */
export function tileSizes(aspect: number): string {
  return frameSizes({
    frameWidths: [
      { media: "(min-width: 640px)", width: ROW_HEIGHT_PX * aspect, unit: "px" },
      { width: Math.min(PHONE_TILE_HEIGHT_VW * aspect, PHONE_MAX_TILE_WIDTH_VW), unit: "vw" },
    ],
    zoom: HOVER_ZOOM,
  });
}
