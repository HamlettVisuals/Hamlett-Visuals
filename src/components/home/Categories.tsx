"use client";

import Link from "next/link";
import HoverZoomImage from "@/components/HoverZoomImage";
import { generateAltText } from "@/lib/generate-alt-text";
import { resolvePhoto } from "@/lib/resolve-photo";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { CategoriesIntro, Category } from "@/payload-types";

// Categories section (#categories). A uniform grid of tall tiles — one per
// category — that reads as a gallery hang: three columns on desktop (3×2), two
// on tablet (2×3), a single column on mobile, every tile the same 9:16 portrait
// proportion at every breakpoint. Six categories divide evenly into both 2 and
// 3, so every row stays full — a 4-wide layout would leave a ragged 4 + 2.
//
// Each tile is a photo above a caption: the image keeps the 9:16 crop and the
// site-wide hover-zoom (<HoverZoomImage>), then a small gap, the category name
// in --font-display, and the one-line descriptor below it. Caption text sits on
// the page ground in --color-ink / --color-muted — no scrim, nothing overlaid
// on the photo. Flat, no shadow, no radius (DESIGN.md → flat surfaces).
//
// Copy and image path live on each `categories` entry in
// src/lib/site-content.ts, so this grid, the portfolio routes and the hero
// filmstrip all draw from one list.

export default function Categories({
  categoriesIntro,
  categories,
}: {
  categoriesIntro: CategoriesIntro;
  categories: Category[];
}) {
  // Live Preview overlays the admin's current unsaved form state on top of
  // `categoriesIntro` via postMessage — same mechanism as Hero/About. The
  // grid itself doesn't live-sync — it's driven by the Categories
  // collection, which gets plain Live Preview only (see payload.config.ts).
  const { data } = useScopedLivePreview<CategoriesIntro>({
    initialData: categoriesIntro,
    serverURL,
    globalSlug: "categories-intro",
    apiRoute: "/hv-studio/api",
  });

  // Tiles without a cover photo are skipped rather than shown broken —
  // same approach as Hero's filmstrip for the same underlying data.
  const tiles = categories.flatMap((category) => {
    const coverPhoto = resolvePhoto(category.coverPhoto);
    const coverPhotoUrl = coverPhoto?.url;
    if (!coverPhotoUrl) return [];
    return [{ category, coverPhoto: { ...coverPhoto, url: coverPhotoUrl } }];
  });

  return (
    <section id="categories" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="text-center font-display text-heading text-ink">
          {data.heading}
        </h2>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {tiles.map(({ category, coverPhoto }) => (
            <li key={category.slug}>
              <Link href={`/portfolio/${category.slug}`} className="block">
                <HoverZoomImage
                  src={coverPhoto.url}
                  alt={
                    coverPhoto.alt ||
                    generateAltText({ kind: "category", category: category.name })
                  }
                  sizes="(min-width: 1024px) 336px, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[9/16] w-full"
                />

                <div className="mt-3 text-center">
                  <h3 className="font-display text-title font-medium text-ink">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-body text-muted">{category.blurb}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
