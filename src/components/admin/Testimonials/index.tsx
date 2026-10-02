import type { AdminViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { formatAdminURL } from "payload/shared";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { SetStepNav } from "@payloadcms/ui";
import { adminLoginURL } from "@/lib/admin-redirect";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";
import { comparePhotos, compareTestimonials } from "@/lib/manual-order";
import TestimonialsList from "./TestimonialsList";
import type { TestimonialRow, TestimonialSection, Thumbnail } from "./types";

// The Testimonials list (admin.components.views.testimonials in
// payload.config.ts, path /testimonials; the collection's own list URL
// redirects here, src/proxy.ts). One section per category in the
// Categories order, her order inside (drag, TestimonialsList.tsx), the
// same as /testimonials. ?view=review shows only Needs review: client
// submissions that are still hidden. Wrapped in DefaultTemplate for the
// same reason as KanbanBoard/index.tsx.
//
// Everything up front, one query each: categories, testimonials, their
// albums, the photos they can show (own, album covers, category covers)
// and the homepage picks.

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number }).id : (value as number | null | undefined);

type PhotoLike = {
  id: number;
  event?: number | { id: number } | null;
  url?: string | null;
  alt?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
  albumOrder?: string | null;
  createdAt?: string | null;
};

const toThumbnail = (photo: PhotoLike | undefined): Thumbnail | null => {
  const src = photo?.sizes?.thumbnail?.url || photo?.url;
  return photo && src ? { src, alt: photo.alt ?? "" } : null;
};

const SNIPPET = 90;
const snippet = (quote: string) => (quote.length > SNIPPET ? `${quote.slice(0, SNIPPET).trimEnd()}…` : quote);

export default async function TestimonialsView(props: AdminViewServerProps) {
  const { payload, params, searchParams, initPageResult } = props;
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { user, i18n } = req;
  const adminRoute = payload.config.routes.admin;
  if (!user) redirect(adminLoginURL(formatAdminURL({ adminRoute, path: "/testimonials" })));

  const reviewOnly = searchParams?.view === "review";
  const photoSelect = { event: true, url: true, filename: true, alt: true, sizes: { thumbnail: true }, albumOrder: true, createdAt: true } as const;
  const access = { overrideAccess: false, user } as const;

  const [categories, testimonials, teaser] = await Promise.all([
    payload.find({
      collection: "categories",
      where: { slug: { not_equals: OTHER_SESSION_TYPE } },
      sort: "_order",
      pagination: false,
      depth: 0,
      select: { name: true, published: true, coverPhoto: true },
      ...access,
    }),
    payload.find({
      collection: "testimonials",
      pagination: false,
      depth: 0,
      select: {
        quote: true,
        clientName: true,
        category: true,
        event: true,
        photo: true,
        published: true,
        source: true,
        listOrder: true,
        createdAt: true,
      },
      ...access,
    }),
    payload.findGlobal({ slug: "testimonials-teaser", depth: 0, ...access }),
  ]);

  const eventIds = [...new Set(testimonials.docs.map((t) => idOf(t.event)).filter((id): id is number => id != null))];
  const ownPhotoIds = testimonials.docs.map((t) => idOf(t.photo)).filter((id): id is number => id != null);
  const coverIds = categories.docs.map((c) => idOf(c.coverPhoto)).filter((id): id is number => id != null);
  const directIds = [...new Set([...ownPhotoIds, ...coverIds])];

  const [events, directPhotos, albumPhotos] = await Promise.all([
    eventIds.length
      ? payload.find({ collection: "events", where: { id: { in: eventIds } }, pagination: false, depth: 0, select: { title: true }, trash: true, ...access })
      : { docs: [] },
    directIds.length
      ? payload.find({ collection: "photos", where: { id: { in: directIds } }, pagination: false, depth: 0, select: photoSelect, ...access })
      : { docs: [] },
    eventIds.length
      ? payload.find({ collection: "photos", where: { event: { in: eventIds } }, pagination: false, depth: 0, select: photoSelect, ...access })
      : { docs: [] },
  ]);

  const titleByEvent = new Map(events.docs.map((event) => [event.id, event.title]));
  const photoById = new Map((directPhotos.docs as PhotoLike[]).map((photo) => [photo.id, photo]));
  const coverByAlbum = new Map<number, PhotoLike>();
  for (const photo of (albumPhotos.docs as PhotoLike[]).toSorted(comparePhotos)) {
    const albumId = idOf(photo.event);
    if (albumId != null && photo.url && !coverByAlbum.has(albumId)) coverByAlbum.set(albumId, photo);
  }
  const coverByCategory = new Map(categories.docs.map((c) => [c.id, photoById.get(idOf(c.coverPhoto) ?? -1)]));
  const picks = new Set((teaser.testimonials ?? []).map((pick) => idOf(pick)));

  const needsReview = (t: (typeof testimonials.docs)[number]) => t.source === "client" && t.published === false;
  const reviewCount = testimonials.docs.filter(needsReview).length;

  const rowsByCategory = new Map<number | null, TestimonialRow[]>();
  for (const t of testimonials.docs.toSorted(compareTestimonials)) {
    if (reviewOnly && !needsReview(t)) continue;
    const categoryId = idOf(t.category) ?? null;
    const eventId = idOf(t.event);
    const photo =
      [photoById.get(idOf(t.photo) ?? -1), eventId != null ? coverByAlbum.get(eventId) : undefined, categoryId != null ? coverByCategory.get(categoryId) : undefined].find(
        (candidate) => candidate?.url,
      );
    const rows = rowsByCategory.get(categoryId) ?? [];
    rows.push({
      id: t.id,
      clientName: t.clientName,
      snippet: snippet(t.quote),
      albumTitle: eventId != null ? titleByEvent.get(eventId) ?? null : null,
      published: t.published !== false,
      onHomepage: picks.has(t.id),
      fromClient: t.source === "client",
      thumbnail: toThumbnail(photo),
    });
    rowsByCategory.set(categoryId, rows);
  }

  const sections: TestimonialSection[] = categories.docs
    .map((category) => ({
      id: category.id,
      name: category.name,
      published: category.published !== false,
      rows: rowsByCategory.get(category.id) ?? [],
    }))
    // Needs review lists only the categories that have something to review.
    .filter((section) => !reviewOnly || section.rows.length > 0);
  // No category yet (client submissions), then a category in the Trash.
  const listed = new Set(categories.docs.map((c) => c.id));
  const leftover = [...rowsByCategory.entries()].filter(([id]) => id === null || !listed.has(id)).flatMap(([, rows]) => rows);
  if (leftover.length) sections.push({ id: null, name: "No category yet", published: true, rows: leftover });

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      viewType="testimonials"
      visibleEntities={{
        collections: visibleEntities?.collections ?? [],
        globals: visibleEntities?.globals ?? [],
      }}
    >
      <SetStepNav nav={[{ label: "Testimonials" }]} />
      <TestimonialsList sections={sections} reviewOnly={reviewOnly} reviewCount={reviewCount} />
    </DefaultTemplate>
  );
}
