import Link from "next/link";
import HoverZoomImage from "@/components/HoverZoomImage";
import { categories } from "@/lib/site-content";

// Categories section (#categories). A uniform grid of tall tiles — one per
// category — that reads as a gallery hang: four columns on desktop, 2×2 on
// tablet, a single column on mobile, every tile the same 9:16 portrait
// proportion at every breakpoint.
//
// Each tile is the photograph. Flat, no shadow, no radius (DESIGN.md → flat
// surfaces); the only motion is the site-wide hover-zoom via <HoverZoomImage>.
// Name + one-line descriptor sit over the foot of the image on a scrim that
// covers only the lower band, so the top of every photo stays true.
//
// Copy and image path live on each `categories` entry in
// src/lib/site-content.ts, so this grid, the portfolio routes and the hero
// filmstrip all draw from one list.

export default function Categories() {
  return (
    <section id="categories" className="border-t border-hairline">
      <div className="mx-auto max-w-5xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">Browse by category</h2>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/portfolio/${category.slug}`}
                className="relative block"
              >
                <HoverZoomImage
                  src={category.image}
                  alt={`${category.name} photography`}
                  sizes="(min-width: 1024px) 244px, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[9/16] w-full"
                />

                {/* Scrim — lower band only, fading out well before the midline
                    so it sits behind the text without washing the photo. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%]"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(23,22,20,0.76) 0%, rgba(23,22,20,0.32) 46%, rgba(23,22,20,0) 100%)",
                  }}
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                  <h3
                    className="font-display text-title font-medium text-canvas"
                    style={{ textShadow: "0 1px 16px rgba(23,22,20,0.5)" }}
                  >
                    {category.name}
                  </h3>
                  <p
                    className="mt-1 text-body text-canvas/85"
                    style={{ textShadow: "0 1px 12px rgba(23,22,20,0.55)" }}
                  >
                    {category.blurb}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
