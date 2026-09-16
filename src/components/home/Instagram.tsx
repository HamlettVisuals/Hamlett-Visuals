import HoverZoomImage from "@/components/HoverZoomImage";
import { instagram } from "@/lib/site-content";
import { instagramPosts, selectFeaturedPosts } from "@/lib/instagram-posts";

// Recent on Instagram section (#instagram), between the Booking CTA and the
// Testimonials teaser.
//
// Tiles reuse the site's photo treatment — the same 3:4 crop and hover-zoom
// as Gallery/PhotoGrid — so this reads as a natural extension of the
// galleries rather than a third-party widget. The grid itself is its own
// INSTAGRAM_GRID_CLASS rather than PhotoGrid's PHOTO_GRID_CLASS: this section
// tops out at 3 columns on desktop instead of 4, deliberately independent
// from the gallery grid so either can change column counts without affecting
// the other. Each tile links out to the real post via `permalink` in a new
// tab.
const INSTAGRAM_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4";

// FEATURED_COUNT posts are chosen via selectFeaturedPosts() rather than a
// plain slice — see lib/instagram-posts.ts for why that indirection exists
// even though today's source list is fully hardcoded. Keep this a multiple
// of 3 to match INSTAGRAM_GRID_CLASS's column count (3 from `sm` up) so the
// grid always fills complete rows — update both together if either changes.
const FEATURED_COUNT = 6;

export default function Instagram() {
  const posts = selectFeaturedPosts(instagramPosts, FEATURED_COUNT);

  return (
    <section id="instagram" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-display text-heading text-ink">
            Recent on Instagram
          </h2>
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link inline-flex items-center gap-1.5 text-body text-ink"
          >
            <InstagramGlyph className="h-4 w-4" />
            Follow along
          </a>
        </div>

        <div className={`mt-8 ${INSTAGRAM_GRID_CLASS}`}>
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <HoverZoomImage
                src={post.imageUrl}
                alt={post.caption}
                sizes="(min-width: 1024px) 389px, (min-width: 640px) 30vw, 45vw"
                className="aspect-[3/4] w-full"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstagramGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}
