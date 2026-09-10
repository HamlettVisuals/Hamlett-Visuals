import HoverZoomImage from "@/components/HoverZoomImage";
import { instagramPosts } from "@/lib/site-content";

// Recent on Instagram section (#instagram), between the Booking CTA and the
// Testimonials teaser. One quiet strip of square post tiles under the heading.
//
// The shape is deliberately different from the Categories grid: Instagram posts
// are square (1:1) where the category tiles are tall 9:16, and this row runs
// six-across on desktop (2 on mobile, 3 on tablet) so it reads as a feed rather
// than a gallery hang. Each tile is just the photo in the site hover-zoom frame
// (<HoverZoomImage>), linking out to Instagram in a new tab — no caption, no
// overlay, no border. Flat, one hover effect only (DESIGN.md → flat surfaces).
//
// The @hamletvisuals handle and profile URL are the same placeholders used in
// the Footer and the Booking CTA — keep the three in sync until the real
// account details land.

const instagramProfileUrl = "https://www.instagram.com/";
const instagramHandle = "@hamletvisuals";

export default function Instagram() {
  return (
    <section id="instagram" className="border-t border-hairline">
      <div className="mx-auto max-w-5xl px-gutter py-section">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-display text-heading text-ink">
            Recent on Instagram
          </h2>
          <a
            href={instagramProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link text-body text-ink"
          >
            {instagramHandle}
          </a>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {instagramPosts.map((post) => (
            <li key={post.id}>
              <a
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <HoverZoomImage
                  src={post.image}
                  alt={post.caption}
                  sizes="(min-width: 1024px) 160px, (min-width: 640px) 33vw, 50vw"
                  className="aspect-square w-full"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
