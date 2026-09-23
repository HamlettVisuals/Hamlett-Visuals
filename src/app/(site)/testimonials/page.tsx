import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import HoverZoomImage from "@/components/HoverZoomImage";
import { generateAltText } from "@/lib/generate-alt-text";
import { resolvePhoto } from "@/lib/resolve-photo";
import type { Category, Event, Testimonial } from "@/payload-types";

// Full testimonials page. The teaser (src/components/home/Testimonials.tsx)
// stays text-only and untouched by design; this page is the whole set,
// grouped by category (in Payload's category `order`), each entry paired
// with its photo and — when a testimonial has one — a deep link back to the
// actual session (/portfolio/[category]#[eventSlug], landing on the matching
// EventRow — see src/components/Gallery/EventRow.tsx and the
// scroll-padding-top rule in globals.css that keeps it clear of the sticky
// header on both a same-page jump and a fresh page load with the hash
// already in the URL).
//
// Quotes lead at text-title so they read as the page's main content; the
// client name, context, photo and gallery link sit under/beside each as
// quiet attribution. Flat throughout — hairline rules between entries (the
// same device the Offers list uses for real item boundaries) and the
// existing .link-chip-inline pill (reused from OfferActions) for the gallery
// link. No cards, no shadow.

export const metadata = {
  title: "Testimonials — Hamlett Visuals",
};

function resolveCategory(category: Testimonial["category"]): Category | null {
  return typeof category === "object" && category !== null ? category : null;
}

function resolveEvent(event: Testimonial["event"]): Event | null {
  return typeof event === "object" && event !== null ? event : null;
}

export default async function TestimonialsPage() {
  const payload = await getPayload({ config });
  // depth: 1 so category/event/photo all come back populated in one query —
  // no separate lookups needed, unlike the two-query Category -> Event ->
  // Photo fetch on /portfolio/[category] (there, one Events query can back
  // many Photos; here each Testimonial already carries its own relations).
  const { docs: testimonials } = await payload.find({
    collection: "testimonials",
    where: { published: { equals: true } },
    depth: 1,
    limit: 0,
  });

  // Group by category (skipping testimonials with no category set), ordered
  // by the Categories collection's own `order` field.
  const groupsByCategory = new Map<
    number,
    { category: Category; items: Testimonial[] }
  >();
  for (const testimonial of testimonials) {
    const category = resolveCategory(testimonial.category);
    if (!category) continue;
    const group = groupsByCategory.get(category.id);
    if (group) group.items.push(testimonial);
    else groupsByCategory.set(category.id, { category, items: [testimonial] });
  }
  const groups = Array.from(groupsByCategory.values()).sort(
    (a, b) => (a.category.order ?? 0) - (b.category.order ?? 0),
  );

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
                {items.map((testimonial) => {
                  const photo = resolvePhoto(testimonial.photo);
                  const event = resolveEvent(testimonial.event);

                  return (
                    <li
                      key={testimonial.id}
                      className="border-t border-hairline py-8 first:border-t-0 first:pt-0"
                    >
                      <div
                        className={
                          photo?.url
                            ? "grid grid-cols-[96px_1fr] gap-4 sm:grid-cols-[160px_1fr] sm:gap-6"
                            : undefined
                        }
                      >
                        {photo?.url && (
                          <HoverZoomImage
                            src={photo.url}
                            alt={
                              photo.alt ||
                              generateAltText({
                                kind: "testimonial",
                                eventName: event?.title,
                                category: category.name,
                              })
                            }
                            sizes="(min-width: 640px) 160px, 96px"
                            className="aspect-[4/5] w-full"
                          />
                        )}

                        <figure className="min-w-0">
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

                          {event && (
                            <Link
                              href={`/portfolio/${category.slug}#${event.slug}`}
                              className="link-chip link-chip-inline mt-4"
                            >
                              <span className="link-chip-icon">
                                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                  <rect
                                    x="1.75"
                                    y="3.25"
                                    width="12.5"
                                    height="9.5"
                                    rx="1.5"
                                    stroke="currentColor"
                                    strokeWidth="1.3"
                                  />
                                  <circle cx="5.5" cy="6.5" r="1.15" fill="currentColor" />
                                  <path
                                    d="m2.5 12 3.35-3.35a1 1 0 0 1 1.4 0L9.5 11m0-1.5 1.6-1.6a1 1 0 0 1 1.4 0l1.75 1.75"
                                    stroke="currentColor"
                                    strokeWidth="1.3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                              <span className="link-chip-title">
                                View the {category.name} gallery
                              </span>
                            </Link>
                          )}
                        </figure>
                      </div>
                    </li>
                  );
                })}
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
