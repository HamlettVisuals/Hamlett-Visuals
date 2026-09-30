import type { DefaultServerCellComponentProps } from "payload";
import { comparePhotos } from "@/lib/manual-order";

// The Albums list's thumbnail (collections/Events.ts, `cover` column).
// Albums have no cover photo of their own yet (planned for the Photo
// Library build), so this is the album's first photo, the same one that
// leads its row on the category page (the first in her order), or the
// neutral placeholder the Categories list uses. A server component, so
// it's one small query per row on the server
// rather than a fetch from the browser per row.
export default async function AlbumThumbnailCell({ payload, rowData }: DefaultServerCellComponentProps) {
  const id = rowData?.id;
  const { docs } = id
    ? await payload.find({
        collection: "photos",
        where: { event: { equals: id } },
        depth: 0,
        pagination: false,
        select: { url: true, filename: true, alt: true, sizes: { thumbnail: true }, albumOrder: true, createdAt: true },
      })
    : { docs: [] };
  const photo = docs.toSorted(comparePhotos)[0];
  const src = photo?.sizes?.thumbnail?.url || photo?.url;

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
    <img className="category-thumb" src={src} alt={photo.alt ?? ""} loading="lazy" />
  ) : (
    <span className="category-thumb category-thumb--empty" aria-label="No photos yet" title="No photos yet" />
  );
}
