"use client";

import Link from "next/link";
import HoverZoomImage from "@/components/HoverZoomImage";
import { generateAltText } from "@/lib/generate-alt-text";
import { HOVER_ZOOM, photoSizes, type FrameWidth } from "@/lib/image-sizes";
import { resolvePhoto } from "@/lib/resolve-photo";
import { serverURL } from "@/lib/server-url";
import { useScopedCollectionLivePreview } from "@/lib/use-scoped-collection-live-preview";
import type { Category } from "@/payload-types";

// Each tile's frame: 9:16, one column of Categories.tsx's grid. From 1280px
// the grid stops growing (max-w-7xl, 40px gutters, two 16px gaps), so a tile
// is (1280 − 80 − 32) ÷ 3 ≈ 389.3px; below that, a column is a bit under
// ⅓, ½ or all of the viewport.
const TILE_ASPECT = 9 / 16;
const TILE_WIDTHS: FrameWidth[] = [
  { media: "(min-width: 1280px)", width: (1280 - 80 - 32) / 3, unit: "px" },
  { media: "(min-width: 1024px)", width: 34, unit: "vw" },
  { media: "(min-width: 640px)", width: 50, unit: "vw" },
  { width: 100, unit: "vw" },
];

// One tile of the homepage category grid (components/home/Categories.tsx).
// Its own client component so it can follow the Categories editor's unsaved
// name, blurb and cover photo in Live Preview — but only when it's the
// category being edited (`?lpDoc=<id>`, see Categories.ts livePreview.url
// and lib/use-scoped-collection-live-preview.ts). The `id` is what the
// preview URL's `#live-preview:category-<slug>` scrolls to.
//
// A category without a cover photo is skipped rather than shown broken —
// checked here, after the live data, so picking a cover photo in the editor
// brings the tile into the preview before saving.
export default function CategoryTile({ category }: { category: Category }) {
  const { data } = useScopedCollectionLivePreview<Category>({
    initialData: category,
    serverURL,
    collectionSlug: "categories",
    apiRoute: "/hv-studio/api",
    depth: 1,
  });

  const coverPhoto = resolvePhoto(data.coverPhoto);
  if (!coverPhoto?.url) return null;

  return (
    <li id={`category-${category.slug}`} className="scroll-mt-20">
      <Link href={`/portfolio/${category.slug}`} className="block">
        <HoverZoomImage
          src={coverPhoto.url}
          alt={coverPhoto.alt || generateAltText({ kind: "category", category: data.name })}
          sizes={photoSizes({
            photo: coverPhoto,
            frameAspect: TILE_ASPECT,
            frameWidths: TILE_WIDTHS,
            zoom: HOVER_ZOOM,
          })}
          className="aspect-[9/16] w-full"
          focal={coverPhoto}
        />

        <div className="mt-3 text-center">
          <h3 className="font-display text-title font-medium text-ink">{data.name}</h3>
          <p className="mt-1 text-body text-muted">{data.blurb}</p>
        </div>
      </Link>
    </li>
  );
}
