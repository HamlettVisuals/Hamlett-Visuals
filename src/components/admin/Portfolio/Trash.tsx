import type { AdminViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { formatAdminURL } from "payload/shared";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { SetStepNav } from "@payloadcms/ui";
import { adminLoginURL } from "@/lib/admin-redirect";
import { comparePhotos } from "@/lib/manual-order";
import TrashList, { type TrashItem } from "./TrashList";

// The Categories & Albums page's Trash tab (admin.components.views
// .portfolioTrash, path /portfolio/trash): deleted categories and deleted
// albums in two sections, newest deletion first, each with Payload's own
// Restore and Delete permanently (TrashList.tsx). The Categories and Albums
// Trash URLs redirect here (src/proxy.ts).

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

const thumb = (photo: PhotoLike | undefined) => {
  const src = photo?.sizes?.thumbnail?.url || photo?.url;
  return photo && src ? { src, alt: photo.alt ?? "" } : null;
};

export default async function PortfolioTrashView(props: AdminViewServerProps) {
  const { payload, params, searchParams, initPageResult } = props;
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { user, i18n } = req;
  const adminRoute = payload.config.routes.admin;

  if (!user) {
    redirect(adminLoginURL(formatAdminURL({ adminRoute, path: "/portfolio/trash" })));
  }

  const inTrash = { deletedAt: { exists: true } } as const;
  const photoSelect = { event: true, url: true, filename: true, alt: true, sizes: { thumbnail: true }, albumOrder: true, createdAt: true } as const;
  const [categories, albums, allCategories] = await Promise.all([
    payload.find({
      collection: "categories",
      where: inTrash,
      trash: true,
      sort: "-deletedAt",
      pagination: false,
      depth: 0,
      select: { name: true, coverPhoto: true, deletedAt: true },
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "events",
      where: inTrash,
      trash: true,
      sort: "-deletedAt",
      pagination: false,
      depth: 0,
      select: { title: true, category: true, deletedAt: true },
      overrideAccess: false,
      user,
    }),
    // Names for the albums' categories, including deleted ones.
    payload.find({
      collection: "categories",
      trash: true,
      pagination: false,
      depth: 0,
      select: { name: true, deletedAt: true },
      overrideAccess: false,
      user,
    }),
  ]);

  const coverIds = categories.docs.map((c) => idOf(c.coverPhoto)).filter((id): id is number => id != null);
  const albumIds = albums.docs.map((a) => a.id);
  const [covers, albumPhotos] = await Promise.all([
    coverIds.length
      ? payload.find({ collection: "photos", where: { id: { in: coverIds } }, trash: true, pagination: false, depth: 0, select: photoSelect, overrideAccess: false, user })
      : { docs: [] },
    albumIds.length
      ? payload.find({ collection: "photos", where: { event: { in: albumIds } }, pagination: false, depth: 0, select: photoSelect, overrideAccess: false, user })
      : { docs: [] },
  ]);
  const coverById = new Map((covers.docs as PhotoLike[]).map((p) => [p.id, p]));
  const firstPhoto = new Map<number, PhotoLike>();
  for (const photo of (albumPhotos.docs as PhotoLike[]).toSorted(comparePhotos)) {
    const albumId = idOf(photo.event);
    if (albumId != null && !firstPhoto.has(albumId)) firstPhoto.set(albumId, photo);
  }
  const categoryById = new Map(allCategories.docs.map((c) => [c.id, c]));

  const deletedCategories: TrashItem[] = categories.docs.map((c) => ({
    id: c.id,
    title: c.name,
    deletedAt: c.deletedAt ?? null,
    thumbnail: thumb(coverById.get(idOf(c.coverPhoto) ?? -1)),
    note: null,
  }));
  const deletedAlbums: TrashItem[] = albums.docs.map((a) => {
    const category = categoryById.get(idOf(a.category) ?? -1);
    return {
      id: a.id,
      title: a.title,
      deletedAt: a.deletedAt ?? null,
      thumbnail: thumb(firstPhoto.get(a.id)),
      note: category ? `${category.name}${category.deletedAt ? " (also deleted)" : ""}` : null,
    };
  });

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
      viewType="portfolio-trash"
      visibleEntities={{
        collections: visibleEntities?.collections ?? [],
        globals: visibleEntities?.globals ?? [],
      }}
    >
      <SetStepNav
        nav={[
          { label: "Categories & Albums", url: formatAdminURL({ adminRoute, path: "/portfolio" }) },
          { label: "Trash" },
        ]}
      />
      <TrashList categories={deletedCategories} albums={deletedAlbums} />
    </DefaultTemplate>
  );
}
