import Link from "next/link";
import HoverZoomImage from "@/components/HoverZoomImage";
import {
  instagram,
  instagramPosts,
  offers,
  type InstagramPost,
} from "@/lib/site-content";

// Recent on Instagram section (#instagram), between the Booking CTA and the
// Testimonials teaser.
//
// A fixed 3×3 grid of nine curated posts — 2 columns on mobile, 3 from tablet
// up. The count is deliberately fixed at 9: this is hand-picked data, not a
// live feed (a real "most recent posts" sync is a later backend job — see the
// TODO on `instagramPosts` in src/lib/site-content.ts). The entry shape mirrors
// an Instagram Graph API media object so wiring up the real feed later is a
// data-source swap, not a redesign.
//
// Tiles: square, the site hover-zoom (<HoverZoomImage>), and a slight
// `rounded-media` corner — the one place a photo frame is softened on the site
// (DESIGN.md → Layout & surfaces). Optional caption + subcaption render as
// plain text below the tile, never over the photo (consistent with the
// Categories fix); no italic (Inter's italic isn't loaded, per OfferTerms).
// When a post names a related offer or category, the caption line links there
// quietly via .link-quiet — not a button.
//
// The @hamlettvisuals handle and URL come from the shared `instagram` constant,
// the single source of truth also used by the Footer and the Booking CTA.

function relatedHref(post: InstagramPost): string | null {
  if (post.relatedCategorySlug) {
    return `/portfolio/${post.relatedCategorySlug}`;
  }
  if (post.relatedOfferId) {
    const offer = offers.find((entry) => entry.id === post.relatedOfferId);
    return offer ? `/portfolio/${offer.categorySlug}` : null;
  }
  return null;
}

export default function Instagram() {
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
            className="link text-body text-ink"
          >
            {instagram.handle}
          </a>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          {instagramPosts.map((post) => {
            const href = relatedHref(post);
            return (
              <li key={post.id}>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <HoverZoomImage
                    src={post.image}
                    alt={post.alt}
                    sizes="(min-width: 640px) 33vw, 50vw"
                    className="aspect-square w-full rounded-media"
                  />
                </a>

                {post.caption && (
                  <div className="mt-2">
                    <p className="text-caption text-ink">
                      {href ? (
                        <Link href={href} className="link-quiet">
                          {post.caption}
                        </Link>
                      ) : (
                        post.caption
                      )}
                    </p>
                    {post.subcaption && (
                      <p className="text-caption text-muted">{post.subcaption}</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
