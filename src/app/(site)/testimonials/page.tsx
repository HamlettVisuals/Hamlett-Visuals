import type { Metadata } from "next";
import { draftMode, headers as getHeaders } from "next/headers";
import Link from "next/link";
import { getPayload, type Where } from "payload";
import config from "@payload-config";
import HoverZoomImage from "@/components/HoverZoomImage";
import { formatAlbumDate } from "@/lib/album-date";
import { generateAltText } from "@/lib/generate-alt-text";
import { comparePhotos, compareTestimonials } from "@/lib/manual-order";
import { DEFAULT_TESTIMONIALS_PAGE_QUOTE_FONT, resolveQuoteFont } from "@/lib/quote-font-options";
import { QUOTE_CLASS, quoteFontProps } from "@/lib/quote-fonts";
import { trimQuoteMarks } from "@/lib/quote-marks";
import LiveTestimonialText from "@/components/testimonials/LiveTestimonialText";
import { PageHeader, ReviewSection } from "@/components/testimonials/LivePageText";
import { resolvePhoto } from "@/lib/resolve-photo";
import type { Category, Event, Photo, Testimonial } from "@/payload-types";
import QuoteFontPreview from "./QuoteFontPreview";

// Full testimonials page. The teaser (src/components/home/Testimonials.tsx)
// stays text-only and untouched by design; this page is the whole set,
// grouped by category (in the Categories list's drag order), her order
// within each (the Testimonials list's drag, `listOrder`), each entry paired
// with a photo and a link: to the session itself when the testimonial names
// one (/portfolio/[event's category]#[eventSlug], landing on the matching
// EventRow — see src/components/Gallery/EventRow.tsx), otherwise to the
// category's gallery. The scroll-padding-top rule in globals.css keeps both
// that target and this page's own category anchors clear of the sticky
// header.
//
// Quotes lead at text-title size so they read as the page's main content,
// set in a font from the curated registry (lib/quote-fonts.ts), chosen on
// the Testimonials Page global — the one place the site allows a third
// typeface and italics. The title, intro and "Worked with me?" section come
// from that global too (components/testimonials/LivePageText.tsx). The client name,
// context, photo and link sit under/beside each as quiet attribution in
// Inter. Flat throughout —
// hairline rules between entries (the same device the Offers list uses for
// real item boundaries) and the existing .link-chip-inline pill (reused from
// OfferActions) for the link. No cards, no shadow.

// Each card is #testimonial-<id>, so Live Preview opens on the one being
// edited (app/api/preview/testimonial). In preview mode, for a signed-in
// admin only (checked here, on the server), the testimonial being
// previewed shows even while hidden, marked "Hidden, preview only": how she
// reviews a client's testimonial before publishing it. Everyone else gets
// the cached page with published testimonials only.

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayload({ config });
  const page = await payload.findGlobal({ slug: "testimonials-page", depth: 0 });
  return { title: `${page.title?.trim() || "Testimonials"} — Hamlett Visuals` };
}

function resolveCategory(category: Testimonial["category"] | Event["category"]): Category | null {
  return typeof category === "object" && category !== null ? category : null;
}

function resolveEvent(event: Testimonial["event"]): Event | null {
  return typeof event === "object" && event !== null ? event : null;
}

type Entry = {
  testimonial: Testimonial;
  /** What the context line says when her Context field is empty. */
  autoContext: string;
  /** Hidden, shown only in an admin's preview. */
  hidden: boolean;
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

  const payload = await getPayload({ config });
  const page = await payload.findGlobal({ slug: "testimonials-page", depth: 0 });
  const pageFont = resolveQuoteFont(page.quoteFont, DEFAULT_TESTIMONIALS_PAGE_QUOTE_FONT);
  const quoteFont = quoteFontProps(pageFont);

  // The hidden testimonial an admin is previewing, if any. searchParams
  // and the session are only read in preview mode, so the public page
  // stays cached.
  let previewId: number | null = null;
  if ((await draftMode()).isEnabled) {
    // lpDoc: LIVE_PREVIEW_DOC_PARAM (a client module, so not importable here).
    const raw = (await searchParams).lpDoc;
    const { user } = await payload.auth({ headers: await getHeaders() });
    if (user && typeof raw === "string" && /^\d+$/.test(raw)) previewId = Number(raw);
  }
  const where: Where = previewId
    ? { or: [{ published: { equals: true } }, { id: { equals: previewId } }] }
    : { published: { equals: true } };

  // depth: 2 so category, event, photo, the category's cover and the
  // event's own category all come back populated in one query.
  const { docs: unsorted } = await payload.find({
    collection: "testimonials",
    where,
    depth: 2,
    limit: 0,
  });
  const testimonials = unsorted.toSorted(compareTestimonials);

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
    const autoContext = date ? `${category.name} · ${date}` : category.name;

    const photo = [
      resolvePhoto(testimonial.photo),
      linked && albumCovers.get(linked.event.id),
      resolvePhoto(category.coverPhoto),
    ].find((candidate) => candidate?.url) ?? null;

    const entry: Entry = {
      testimonial,
      autoContext,
      hidden: testimonial.published === false,
      href: linked
        ? `/portfolio/${linked.eventCategory.slug}#${linked.event.slug}`
        : `/portfolio/${category.slug}`,
      linkLabel: linked ? `View ${linked.event.title}` : `View the ${category.name} gallery`,
      // Her Context text wins; otherwise the category, plus the album's
      // month when it has a date. The album's name is on the link already.
      context: testimonial.context?.trim() || autoContext,
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
      <PageHeader page={page}>
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
      </PageHeader>

      {fontPreview && groups[0] && (
        <QuoteFontPreview
          quote={trimQuoteMarks(groups[0].entries[0].testimonial.quote)}
          clientName={groups[0].entries[0].testimonial.clientName}
          context={groups[0].entries[0].context}
          current={pageFont}
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
                  {entries.map(({ testimonial, href, linkLabel, autoContext, hidden, photo, eventName }) => {
                    const photoRight = photo?.url ? photoIndex++ % 2 === 1 : false;

                    return (
                      <li
                        key={testimonial.id}
                        id={`testimonial-${testimonial.id}`}
                        className="scroll-mt-6 border-t border-hairline py-10 first:border-t-0 first:pt-0"
                      >
                        {hidden && (
                          <p className="mb-4 inline-block rounded-full border border-hairline px-3 py-1 text-caption text-muted">
                            Hidden, preview only
                          </p>
                        )}
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
                                // An admin's preview of a hidden testimonial:
                                // its photo may not be public yet, so it skips
                                // the optimizer (lib/public-photos.ts).
                                unoptimized={previewId !== null}
                              />
                            </Link>
                          )}

                          <figure className="min-w-0">
                            <LiveTestimonialText
                              id={testimonial.id}
                              quote={testimonial.quote}
                              clientName={testimonial.clientName}
                              context={testimonial.context?.trim() || null}
                              autoContext={autoContext}
                              quoteClassName={`${quoteFont.className} ${QUOTE_CLASS}`}
                              quoteStyle={quoteFont.style}
                            />

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

      <ReviewSection page={page} />
    </div>
  );
}
