import Link from "next/link";
import HoverZoomImage from "@/components/HoverZoomImage";
import { categories } from "@/lib/site-content";

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

export default function Categories() {
  return (
    <section id="categories" className="border-t border-hairline">
      <div className="mx-auto max-w-5xl px-gutter py-section">
        <h2 className="text-center font-display text-heading text-ink">
          Browse by category
        </h2>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link href={`/portfolio/${category.slug}`} className="block">
                <HoverZoomImage
                  src={category.image}
                  alt={`${category.name} photography`}
                  sizes="(min-width: 1024px) 336px, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[9/16] w-full"
                />

                <div className="mt-3">
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
