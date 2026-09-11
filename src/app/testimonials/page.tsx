import Link from "next/link";
import { testimonials } from "@/lib/site-content";
import { getCategories } from "@/lib/categories";

// Full testimonials page. The teaser (src/components/home/Testimonials.tsx)
// shows two featured quotes as compact blocks; this page is the whole set,
// grouped by the kind of shoot. Quotes lead at text-title so they read as the
// page's main content; the client name and context sit under each as quiet
// attribution. Flat throughout — hairline rules between entries, the same
// device the Offers list uses for real item boundaries. No cards, no shadow.

export const metadata = {
  title: "Testimonials — Hamlett Visuals",
};

// Walk `categories` (canonical order: Weddings → Portraits → Pets → Brands →
// Motorsports → Real Estate) and drop any group with no testimonials.
const groups = getCategories()
  .map((category) => ({
    category,
    items: testimonials.filter((t) => t.categorySlug === category.slug),
  }))
  .filter((group) => group.items.length > 0);

export default function TestimonialsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-gutter py-section">
      <header>
        <h1 className="font-display text-page text-ink">Testimonials</h1>
        <p className="mt-3 max-w-measure text-body text-muted">
          A few words from people I&rsquo;ve worked with, sorted by the kind of
          shoot they came for.
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="mt-12 text-body text-muted">No testimonials yet.</p>
      ) : (
        <div className="mt-14 flex flex-col gap-16">
          {groups.map(({ category, items }) => (
            <section key={category.slug}>
              <h2 className="font-display text-heading text-ink">
                {category.name}
              </h2>

              <ul className="mt-6 flex flex-col">
                {items.map((testimonial) => (
                  <li
                    key={testimonial.clientName}
                    className="border-t border-hairline py-8 first:border-t-0 first:pt-0"
                  >
                    <figure>
                      <blockquote className="max-w-measure text-title text-ink">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>
                      <figcaption className="mt-4 text-caption">
                        <span className="text-ink">
                          {testimonial.clientName}
                        </span>
                        {testimonial.context && (
                          <span className="mt-0.5 block text-muted">
                            {testimonial.context}
                          </span>
                        )}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
