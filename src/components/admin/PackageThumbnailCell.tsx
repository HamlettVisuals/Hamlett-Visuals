import type { DefaultServerCellComponentProps } from "payload";

// The Packages list's thumbnail (collections/PricingRows.ts, `thumbnail`
// column): the cover photo of the package's category, the same photo as
// that category's homepage tile and its row on Categories & Albums, or the
// neutral placeholder those use. Looked up from the category rather than
// the package, so it doesn't assume one package per category: two
// packages in a category show the same cover. A server component, so it's
// one small query per row on the server.
export default async function PackageThumbnailCell({ payload, rowData }: DefaultServerCellComponentProps) {
  const category = rowData?.category;
  const categoryId = category && typeof category === "object" ? category.id : category;
  const doc = categoryId
    ? await payload
        .findByID({
          collection: "categories",
          id: categoryId,
          depth: 1,
          trash: true,
          disableErrors: true,
          select: { name: true, coverPhoto: true },
          // filename and prefix let the storage plugin build the URLs.
          populate: { photos: { url: true, filename: true, prefix: true, alt: true, sizes: { thumbnail: true } } },
        })
        .catch(() => null)
    : null;
  // A trashed photo populates as null, like no photo.
  const photo = doc?.coverPhoto && typeof doc.coverPhoto === "object" ? doc.coverPhoto : null;
  const src = photo?.sizes?.thumbnail?.url || photo?.url;
  const label = doc?.name ? `No cover photo for ${doc.name}` : "No category";

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
    <img className="category-thumb" src={src} alt={photo?.alt ?? ""} loading="lazy" />
  ) : (
    <span className="category-thumb category-thumb--empty" aria-label={label} title={label} />
  );
}
