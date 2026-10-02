import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import HoverZoomImage from "@/components/HoverZoomImage";
import { formatAlbumDate } from "@/lib/album-date";
import { generateAltText } from "@/lib/generate-alt-text";
import { comparePhotos } from "@/lib/manual-order";
import { QUOTE_CLASS, quoteFontProps, type QuoteFontKey } from "@/lib/quote-fonts";
import { trimQuoteMarks } from "@/lib/quote-marks";
import { resolvePhoto } from "@/lib/resolve-photo";
import type { Category, Event, Photo, Testimonial } from "@/payload-types";
import QuoteFontPreview from "./QuoteFontPreview";

// Full testimonials page. The teaser (src/components/home/Testimonials.tsx)
// stays text-only and untouched by design; this page is the whole set,
// grouped by category (in the Categories list's drag order), each entry paired
// with a photo and a link: to the session itself when the testimonial names
// one (/portfolio/[event's category]#[eventSlug], landing on the matching
// EventRow — see src/components/Gallery/EventRow.tsx), otherwise to the
// category's gallery. The scroll-padding-top rule in globals.css keeps both
// that target and this page's own category anchors clear of the sticky
// header.
//
// Quotes lead at text-title size so they read as the page's main content,
// set in a font from the curated registry (lib/quote-fonts.ts) — the one
// place the site allows a third typeface and italics. The client name,
// context, photo and link sit under/beside each as quiet attribution in
// Inter. Flat throughout —
// hairline rules between entries (the same device the Offers list uses for
// real item boundaries) and the existing .link-chip-inline pill (reused from
// OfferActions) for the link. No cards, no shadow.

// The quote font, from lib/quote-fonts.ts. Hardcoded for now; an admin
// setting can replace this one line later.
const TESTIMONIALS_PAGE_QUOTE_FONT: QuoteFontKey = "lora";

export const metadata = {
  title: "Testimonials — Hamlett Visuals",
};

// TODO(backend pass): the testimonial form is only reachable from her
// one-time emailed link (/testimonial-request/[token]), so there's nowhere
// public for "Leave a review" to go yet. Point this at the public
// submission page once it exists.
const LEAVE_REVIEW_HREF = "#leave-a-review";

function resolveCategory(category: Testimonial["category"] | Event["category"]): Category | null {
  return typeof category === "object" && category !== null ? category : null;
}

function resolveEvent(event: Testimonial["event"]): Event | null {
  return typeof event === "object" && event !== null ? event : null;
}

type Entry = {
  testimonial: Testimonial;
  href: string;
  linkLabel: string;
  context: string;
  photo: Photo | null;
  eventName?: string;
};

export default async function TestimonialsPage({ searchParams }: PageProps<"/testimonials">) {
  // Dev only: ?fontPreview=1 shows every registry font (QuoteFontPreview).
  // searchParams is only read in development, so the live page renders
  // exactly as before.
  const fontPreview =
    process.env.NODE_ENV === "development" && (await searchParams).fontPreview === "1";
  const quoteFont = quoteFontProps(TESTIMONIALS_PAGE_QUOTE_FONT);

  const payload = await getPayload({ config });
  // depth: 2 so category, event, photo, the category's cover and the
  // event's own category all come back populated in one query.
  const { docs: testimonials } = await payload.find({
    collection: "testimonials",
    where: { published: { equals: true } },
    depth: 2,
    limit: 0,
  });

  // A linked album only counts while its page shows it: the album and its
  // category both published. Otherwise the entry falls back to the
  // testimonial's category, as if no album were linked.
  const linkedEvent = (testimonial: Testimonial) => {
    const event = resolveEvent(testimonial.event);
    const eventCategory = event && resolveCategory(event.category);
    return event?.published && eventCategory?.published ? { event, eventCategory } : null;
  };

  // Albums have no cover field yet; their cover is their first photo in her
  // order, the one that leads the album's row (same as AlbumThumbnailCell).
  // One query for every linked album.
  const linkedEventIds = [
    ...new Set(testimonials.flatMap((t) => linkedEvent(t)?.event.id ?? [])),
  ];
  const { docs: albumPhotos } = linkedEventIds.length
    ? await payload.find({
        collection: "photos",
        where: { event: { in: linkedEventIds } },
        depth: 0,
        limit: 0,
      })
    : { docs: [] };
  const albumCovers = new Map<number, Photo>();
  for (const photo of albumPhotos.toSorted(comparePhotos)) {
    if (typeof photo.event === "number" && photo.url && !albumCovers.has(photo.event)) {
      albumCovers.set(photo.event, photo);
    }
  }

  // Group by category (skipping testimonials with no category set), in the
  // Categories list's drag order (`_order`: fractional-index keys, so a
  // plain string comparison sorts them).
  const groupsByCategory = new Map<number, { category: Category; entries: Entry[] }>();
  for (const testimonial of testimonials) {
    const category = resolveCategory(testimonial.category);
    if (!category) continue;
    const linked = linkedEvent(testimonial);
    const date = linked && formatAlbumDate(linked.event.date);

    const photo = [
      resolvePhoto(testimonial.photo),
      linked && albumCovers.get(linked.event.id),
      resolvePhoto(category.coverPhoto),
    ].find((candidate) => candidate?.url) ?? null;

    const entry: Entry = {
      testimonial,
      href: linked
        ? `/portfolio/${linked.eventCategory.slug}#${linked.event.slug}`
        : `/portfolio/${category.slug}`,
      linkLabel: linked ? `View ${linked.event.title}` : `View the ${category.name} gallery`,
      // Her Context text wins; otherwise the category, plus the album's
      // month when it has a date. The album's name is on the link already.
      context: testimonial.context?.trim() || (date ? `${category.name} · ${date}` : category.name),
      photo,
      eventName: linked?.event.title,
    };

    const group = groupsByCategory.get(category.id);
    if (group) group.entries.push(entry);
    else groupsByCategory.set(category.id, { category, entries: [entry] });
  }
  const groups = Array.from(groupsByCategory.values()).sort(
    (a, b) => ((a.category._order ?? "") < (b.category._order ?? "") ? -1 : 1),
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-gutter py-section">
      <header>
        <h1 className="font-display text-page text-ink">Testimonials</h1>
        <p className="mt-3 max-w-measure text-body text-muted">
          A few words from people I&rsquo;ve worked with, sorted by the kind of
          shoot they came for.
        </p>
        {groups.length >= 2 && (
          <nav aria-label="Categories" className="mt-5">
            <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-ink">
              {groups.map(({ category }, index) => (
                <li key={category.slug} className="flex items-center gap-x-2">
                  {index > 0 && (
                    <span aria-hidden="true" className="text-muted">
                      &middot;
                    </span>
                  )}
                  <a href={`#${category.slug}`} className="link">
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {fontPreview && groups[0] && (
        <QuoteFontPreview
          quote={trimQuoteMarks(groups[0].entries[0].testimonial.quote)}
          clientName={groups[0].entries[0].testimonial.clientName}
          context={groups[0].entries[0].context}
          current={TESTIMONIALS_PAGE_QUOTE_FONT}
        />
      )}

      {groups.length === 0 ? (
        <p className="mt-12 text-body text-muted">No testimonials yet.</p>
      ) : (
        <div className="mt-14 flex flex-col gap-16">
          {groups.map(({ category, entries }) => {
            // Photos alternate sides (left, right, left…) on tablet and up,
            // counting only the entries that have one.
            let photoIndex = 0;
            return (
              <section key={category.slug} aria-labelledby={category.slug}>
                <h2 id={category.slug} className="scroll-mt-6 font-display text-heading text-ink">
                  {category.name}
                </h2>

                <ul className="mt-6 flex flex-col">
                  {entries.map(({ testimonial, href, linkLabel, context, photo, eventName }) => {
                    const photoRight = photo?.url ? photoIndex++ % 2 === 1 : false;

                    return (
                      <li
                        key={testimonial.id}
                        className="border-t border-hairline py-10 first:border-t-0 first:pt-0"
                      >
                        <div
                          className={
                            photo?.url
                              ? `grid gap-5 sm:items-center sm:gap-8 ${
                                  photoRight
                                    ? "sm:grid-cols-[1fr_200px]"
                                    : "sm:grid-cols-[200px_1fr]"
                                }`
                              : undefined
                          }
                        >
                          {photo?.url && (
                            // Same destination as the pill below, which is
                            // the one announced and tabbed to.
                            <Link
                              href={href}
                              tabIndex={-1}
                              aria-hidden="true"
                              className={photoRight ? "sm:order-last" : undefined}
                            >
                              <HoverZoomImage
                                src={photo.url}
                                alt={
                                  photo.alt ||
                                  generateAltText({
                                    kind: "testimonial",
                                    eventName,
                                    category: category.name,
                                  })
                                }
                                sizes="(min-width: 640px) 200px, 100vw"
                                className="aspect-[3/2] w-full sm:aspect-[4/5]"
                                focal={photo}
                              />
                            </Link>
                          )}

                          <figure className="min-w-0">
                            <blockquote
                              className={`${quoteFont.className} ${QUOTE_CLASS}`}
                              style={quoteFont.style}
                            >
                              &ldquo;{trimQuoteMarks(testimonial.quote)}&rdquo;
                            </blockquote>
                            <figcaption className="mt-4 text-caption">
                              <span className="text-ink">{testimonial.clientName}</span>
                              <span className="mt-0.5 block text-muted">{context}</span>
                            </figcaption>

                            <Link href={href} className="link-chip link-chip-inline mt-5">
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
                              <span className="link-chip-title">{linkLabel}</span>
                            </Link>
                          </figure>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <section
        id="leave-a-review"
        aria-labelledby="leave-a-review-heading"
        className="mt-6 border-t border-hairline pt-12"
      >
        <h2 id="leave-a-review-heading" className="font-display text-heading text-ink">
          Worked with me?
        </h2>
        <p className="mt-3 max-w-measure text-body text-muted">
          I&rsquo;d love to hear how it went. Share your experience, and it
          might end up on this page.
        </p>
        <Link href={LEAVE_REVIEW_HREF} className="btn mt-6">
          Leave a review
        </Link>
      </section>
    </div>
  );
}
