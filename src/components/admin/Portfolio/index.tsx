import type { AdminViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { formatAdminURL } from "payload/shared";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { SetStepNav } from "@payloadcms/ui";
import { adminLoginURL } from "@/lib/admin-redirect";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";
import { compareAlbums, comparePhotos } from "@/lib/manual-order";
import PortfolioList from "./PortfolioList";
import type { PortfolioCategory, Thumbnail } from "./types";

// "Categories & Albums" (admin.components.views.portfolio in
// payload.config.ts, path /portfolio): every category as a section, in her
// drag order (the homepage tiles' order), with its albums in her order
// inside. Replaces the separate Categories and Albums lists, whose URLs
// redirect here (src/proxy.ts). Wrapped in DefaultTemplate for the same
// reason as KanbanBoard/index.tsx. The page itself is PortfolioList.tsx.
//
// Loads everything up front (a handful of categories, albums into the
// hundreds): categories, albums, the categories' cover photos and every
// album's photos, one query each.

type PhotoLike = {
  id: number;
  event?: number | { id: number } | null;
  url?: string | null;
  alt?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
  albumOrder?: string | null;
  createdAt?: string | null;
};

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number }).id : (value as number | null | undefined);

const toThumbnail = (photo: PhotoLike | undefined): Thumbnail | null => {
  const src = photo?.sizes?.thumbnail?.url || photo?.url;
  return photo && src ? { src, alt: photo.alt ?? "" } : null;
};

export default async function PortfolioView(props: AdminViewServerProps) {
  const { payload, params, searchParams, initPageResult } = props;
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { user, i18n } = req;
  const adminRoute = payload.config.routes.admin;

  if (!user) {
    redirect(adminLoginURL(formatAdminURL({ adminRoute, path: "/portfolio" })));
  }

  const photoSelect = { event: true, url: true, filename: true, alt: true, sizes: { thumbnail: true }, albumOrder: true, createdAt: true } as const;

  const [categories, albums] = await Promise.all([
    payload.find({
      collection: "categories",
      sort: "_order",
      pagination: false,
      depth: 0,
      select: { name: true, slug: true, published: true, coverPhoto: true },
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "events",
      pagination: false,
      depth: 0,
      select: { title: true, date: true, published: true, category: true, albumOrder: true, createdAt: true },
      overrideAccess: false,
      user,
    }),
  ]);

  const coverIds = categories.docs.map((category) => idOf(category.coverPhoto)).filter((id): id is number => id != null);
  const albumIds = albums.docs.map((album) => album.id);
  const [covers, albumPhotos] = await Promise.all([
    coverIds.length
      ? payload.find({ collection: "photos", where: { id: { in: coverIds } }, pagination: false, depth: 0, select: photoSelect, overrideAccess: false, user })
      : { docs: [] },
    albumIds.length
      ? payload.find({ collection: "photos", where: { event: { in: albumIds } }, pagination: false, depth: 0, select: photoSelect, overrideAccess: false, user })
      : { docs: [] },
  ]);

  const coverById = new Map((covers.docs as PhotoLike[]).map((photo) => [photo.id, photo]));
  // An album's thumbnail is its first photo in her order (its cover).
  const firstPhotoByAlbum = new Map<number, PhotoLike>();
  for (const photo of (albumPhotos.docs as PhotoLike[]).toSorted(comparePhotos)) {
    const albumId = idOf(photo.event);
    if (albumId != null && !firstPhotoByAlbum.has(albumId)) firstPhotoByAlbum.set(albumId, photo);
  }

  const albumsByCategory = new Map<number, PortfolioCategory["albums"]>();
  for (const album of albums.docs.toSorted(compareAlbums)) {
    const categoryId = idOf(album.category);
    if (categoryId == null) continue;
    const rows = albumsByCategory.get(categoryId) ?? [];
    rows.push({
      id: album.id,
      title: album.title,
      date: album.date ?? null,
      published: album.published !== false,
      thumbnail: toThumbnail(firstPhotoByAlbum.get(album.id)),
    });
    albumsByCategory.set(categoryId, rows);
  }

  const sections: PortfolioCategory[] = categories.docs.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    published: category.published !== false,
    isOther: category.slug === OTHER_SESSION_TYPE,
    cover: toThumbnail(coverById.get(idOf(category.coverPhoto) ?? -1)),
    albums: albumsByCategory.get(category.id) ?? [],
  }));
  // "Other" (CRM-only) always last, whatever the stored order says.
  sections.sort((a, b) => Number(a.isOther) - Number(b.isOther));

  // Albums whose category is in the Trash: still editable, listed last.
  const listed = new Set(sections.map((section) => section.id));
  const orphans = [...albumsByCategory.entries()].filter(([id]) => !listed.has(id)).flatMap(([, rows]) => rows);

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
      viewType="portfolio"
      visibleEntities={{
        collections: visibleEntities?.collections ?? [],
        globals: visibleEntities?.globals ?? [],
      }}
    >
      <SetStepNav nav={[{ label: "Categories & Albums" }]} />
      <PortfolioList sections={sections} orphans={orphans} />
    </DefaultTemplate>
  );
}
