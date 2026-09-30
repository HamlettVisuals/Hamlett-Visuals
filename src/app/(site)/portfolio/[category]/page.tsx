import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import CategoryGallery from "@/components/Gallery/CategoryGallery";
import GalleryEmptyState from "@/components/Gallery/GalleryEmptyState";
import type { GalleryEvent } from "@/components/Gallery/types";
import { compareAlbums, comparePhotos } from "@/lib/manual-order";

// Category landing page. Category -> Albums (the `events` collection) ->
// Photos, all from Payload:
// two queries (this category's Events, then Photos where event is one of
// those Events' ids) grouped by event id in application code below, rather
// than one query per event. Albums and each album's photos are in her
// manual order (`albumOrder`, sorted in code by lib/manual-order.ts, which
// also places anything not yet given an order). Each album row follows the
// Albums editor in Live Preview (CategoryGallery.tsx).

export async function generateStaticParams() {
  const payload = await getPayload({ config });
  const { docs: categories } = await payload.find({
    collection: "categories",
    where: { published: { equals: true } },
    limit: 0,
  });
  return categories.map((category) => ({ category: category.slug }));
}

export default async function CategoryPage({
  params,
}: PageProps<"/portfolio/[category]">) {
  const { category: slug } = await params;
  const payload = await getPayload({ config });

  const { docs: matchingCategories } = await payload.find({
    collection: "categories",
    where: { slug: { equals: slug }, published: { equals: true } },
    limit: 1,
  });
  const category = matchingCategories[0];

  if (!category) {
    notFound();
  }

  const { docs: unsortedEvents } = await payload.find({
    collection: "events",
    where: { category: { equals: category.id }, published: { equals: true } },
    depth: 0,
    limit: 0,
  });
  const categoryEvents = unsortedEvents.toSorted(compareAlbums);

  const eventIds = categoryEvents.map((event) => event.id);
  const { docs: unsortedPhotos } = eventIds.length
    ? await payload.find({
        collection: "photos",
        where: { event: { in: eventIds } },
        depth: 0,
        limit: 0,
      })
    : { docs: [] };
  const eventPhotos = unsortedPhotos.toSorted(comparePhotos);

  // Grouped here in application code (not a per-event query) since the
  // photos query above already fetched every event's photos in one shot.
  // Photos without a resolved url are skipped rather than shown broken —
  // same approach as Hero/Categories for their cover/hero photos.
  const photosByEventId = new Map<number, GalleryEvent["photos"]>();
  for (const photo of eventPhotos) {
    if (typeof photo.event !== "number" || !photo.url) continue;
    const resolved = {
      filename: photo.filename ?? `photo-${photo.id}`,
      url: photo.url,
      alt: photo.alt,
      width: photo.width,
      height: photo.height,
      focalX: photo.focalX,
      focalY: photo.focalY,
    };
    const existing = photosByEventId.get(photo.event);
    if (existing) existing.push(resolved);
    else photosByEventId.set(photo.event, [resolved]);
  }

  const events: GalleryEvent[] = categoryEvents.map((event) => ({
    id: event.id,
    slug: event.slug,
    name: event.title,
    description: event.description,
    date: event.date,
    photos: photosByEventId.get(event.id) ?? [],
  }));

  return (
    // w-full is load-bearing, not cosmetic: without it, `main`'s flex stretch
    // fails to size this container once anything inside it (e.g. PhotoGrid's
    // CSS grid) is a `display: grid` descendant, collapsing the whole column
    // to that grid's intrinsic width instead of filling the page.
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-gutter py-section">
      <div>
        <nav className="mb-2 text-caption text-muted">
          <Link href="/#categories" className="link text-ink">
            Portfolio
          </Link>{" "}
          <span aria-hidden="true">›</span> {category.name}
        </nav>
        <h1 className="font-display text-page text-ink">{category.name}</h1>
      </div>

      {/* `albums` is where the Albums editor's Live Preview lands when the
          album itself isn't on the page (Events.ts livePreview.url). */}
      <div id="albums" className="scroll-mt-20">
        {events.length === 0 ? (
          <GalleryEmptyState />
        ) : (
          <CategoryGallery category={category} events={events} />
        )}
      </div>
    </div>
  );
}
