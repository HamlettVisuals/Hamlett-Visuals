import type { DefaultServerCellComponentProps } from "payload";

// The Packages list's thumbnail (collections/PricingRows.ts, `thumbnail`
// column): the first photo of the package's album — the same one that
// leads its samples on the site (photos sorted by createdAt) — or the
// neutral placeholder the Categories and Albums lists use. A server
// component, so it's one small indexed query per row on the server.
export default async function PackageThumbnailCell({ payload, rowData }: DefaultServerCellComponentProps) {
  const album = rowData?.album;
  const albumId = album && typeof album === "object" ? album.id : album;
  const { docs } = albumId
    ? await payload.find({
        collection: "photos",
        where: { event: { equals: albumId } },
        sort: "createdAt",
        limit: 1,
        depth: 0,
        pagination: false,
      })
    : { docs: [] };
  const photo = docs[0];
  const src = photo?.sizes?.thumbnail?.url || photo?.url;
  const label = albumId ? "No photos in this album yet" : "No album chosen";

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
    <img className="category-thumb" src={src} alt={photo.alt ?? ""} loading="lazy" />
  ) : (
    <span className="category-thumb category-thumb--empty" aria-label={label} title={label} />
  );
}
