import type { DefaultServerCellComponentProps } from "payload";

// The Albums list's thumbnail (collections/Events.ts, `cover` column).
// Albums have no cover photo of their own yet (planned for the Photo
// Library build), so this is the album's first photo, the same one that
// leads its row on the category page (photos sorted by createdAt), or the
// neutral placeholder the Categories list uses. A server component, so
// it's one small indexed query per row on the server (limit 1, depth 0)
// rather than a fetch from the browser per row.
export default async function AlbumThumbnailCell({ payload, rowData }: DefaultServerCellComponentProps) {
  const id = rowData?.id;
  const { docs } = id
    ? await payload.find({
        collection: "photos",
        where: { event: { equals: id } },
        sort: "createdAt",
        limit: 1,
        depth: 0,
        pagination: false,
      })
    : { docs: [] };
  const photo = docs[0];
  const src = photo?.sizes?.thumbnail?.url || photo?.url;

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
    <img className="category-thumb" src={src} alt={photo.alt ?? ""} loading="lazy" />
  ) : (
    <span className="category-thumb category-thumb--empty" aria-label="No photos yet" title="No photos yet" />
  );
}
