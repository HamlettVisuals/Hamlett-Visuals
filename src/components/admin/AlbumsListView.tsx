import { DefaultListView } from "@payloadcms/ui";
import type { ListViewClientProps, ListViewServerProps, Where } from "payload";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";
import AlbumsGroupedList, { type AlbumGroup, type AlbumRow } from "@/components/admin/AlbumsGroupedList";

// The Albums list (collections/Events.ts admin.components.views.list):
// Payload's own list view (title, description, All/Trash tabs, search) with
// the table swapped for albums grouped by category (AlbumsGroupedList.tsx).
// The Trash tab renders through here too and keeps Payload's table, as does
// a picker drawer (AlbumsGroupedList renders nothing there).
//
// Sections follow the Categories list's drag order (`_order`); a category
// with no albums still gets one ("No albums yet"), except the CRM-only
// "Other". Albums are newest first, the same sort as the category pages.
// Albums whose category was trashed collect in a last section.
//
// Payload still runs its own paged query for the hidden table; it's small
// (one page), and the view needs its `data` for the search box.

// Server-only props (payload, the request's user, …) can't cross to
// Payload's client-side list view.
const SERVER_ONLY = new Set([
  "collectionConfig",
  "data",
  "documentSubViewType",
  "i18n",
  "id",
  "limit",
  "listPreferences",
  "listSearchableFields",
  "locale",
  "params",
  "payload",
  "permissions",
  "searchParams",
  "user",
  "visibleEntities",
]);

const toClientProps = (props: ListViewServerProps) =>
  Object.fromEntries(Object.entries(props).filter(([key]) => !SERVER_ONLY.has(key))) as ListViewClientProps;

type ThumbPhoto = {
  event?: number | string | { id: number | string } | null;
  url?: string | null;
  alt?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
};

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number | string }).id : (value as number | string | null);

export default async function AlbumsListView(props: ListViewServerProps) {
  const clientProps = toClientProps(props);
  if (props.viewType !== "list") return <DefaultListView {...clientProps} />;

  const { payload, user, searchParams } = props;
  const search = typeof searchParams?.search === "string" ? searchParams.search.trim() : "";
  const where: Where | undefined = search ? { title: { like: search } } : undefined;

  const [categories, albums] = await Promise.all([
    payload.find({
      collection: "categories",
      sort: "_order",
      limit: 0,
      pagination: false,
      depth: 0,
      select: { name: true, slug: true, published: true },
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "events",
      where,
      sort: ["-sortDate", "-createdAt"],
      pagination: false,
      depth: 0,
      select: { title: true, date: true, published: true, category: true },
      overrideAccess: false,
      user,
    }),
  ]);

  // Every listed album's first photo (the one that leads its row on the
  // site), in one query: photos come back oldest first, so the first one
  // seen for an album is its thumbnail.
  const albumIds = albums.docs.map((album) => album.id);
  const photos = albumIds.length
    ? await payload.find({
        collection: "photos",
        where: { event: { in: albumIds } },
        sort: "createdAt",
        pagination: false,
        depth: 0,
        select: { event: true, url: true, filename: true, alt: true, sizes: { thumbnail: true } },
        overrideAccess: false,
        user,
      })
    : { docs: [] as ThumbPhoto[] };
  const thumbnails = new Map<string, AlbumRow["thumbnail"]>();
  for (const photo of photos.docs as ThumbPhoto[]) {
    const albumId = String(idOf(photo.event));
    const src = photo.sizes?.thumbnail?.url || photo.url;
    if (!thumbnails.has(albumId) && src) thumbnails.set(albumId, { src, alt: photo.alt ?? "" });
  }

  const byCategory = new Map<string, AlbumRow[]>();
  for (const album of albums.docs) {
    const key = String(idOf(album.category));
    const rows = byCategory.get(key) ?? [];
    rows.push({
      id: album.id,
      title: album.title,
      date: album.date ?? null,
      published: album.published !== false,
      thumbnail: thumbnails.get(String(album.id)) ?? null,
    });
    byCategory.set(key, rows);
  }

  const groups: AlbumGroup[] = categories.docs
    .filter((category) => category.slug !== OTHER_SESSION_TYPE || byCategory.has(String(category.id)))
    .map((category) => ({
      key: String(category.id),
      anchor: `category-${category.slug}`,
      categoryId: category.id,
      title: category.name,
      hidden: category.published === false,
      albums: byCategory.get(String(category.id)) ?? [],
    }));

  const listed = new Set(groups.map((group) => group.key));
  const position = new Map<number | string, number>(albumIds.map((id, index) => [id, index]));
  const orphans = [...byCategory.entries()]
    .filter(([key]) => !listed.has(key))
    .flatMap(([, rows]) => rows)
    .sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  if (orphans.length > 0) {
    groups.push({
      key: "deleted-categories",
      categoryId: null,
      title: "In deleted categories",
      hidden: false,
      albums: orphans,
    });
  }

  return (
    <DefaultListView
      {...clientProps}
      BeforeListTable={
        <>
          {clientProps.BeforeListTable}
          <AlbumsGroupedList groups={groups} search={search} />
        </>
      }
    />
  );
}
