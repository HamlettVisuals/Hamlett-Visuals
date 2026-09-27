import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import FormatComparison, { type ComparePhoto } from "./FormatComparison";

// TEMPORARY, dev only — compares AVIF and WebP (both quality 90) for
// gallery tiles, to choose next.config's images.formats (docs/image-audit.md).
// Shows three photos — the closest to 4:5, to square and to 3:2 landscape in
// the library, or the ones given as ?ids=1,2,3 — at gallery-tile size, once
// per format. 404s outside `next dev`. Delete this folder once the format
// is chosen.

export const metadata: Metadata = {
  title: "Image format comparison (dev)",
  robots: { index: false, follow: false },
};

const TARGETS = [
  { label: "4:5 portrait", aspect: 4 / 5 },
  { label: "Square", aspect: 1 },
  { label: "Landscape", aspect: 3 / 2 },
];

export default async function ImageComparePage({
  searchParams,
}: PageProps<"/dev/image-compare">) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { ids } = await searchParams;
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "photos",
    depth: 0,
    limit: 0,
    ...(typeof ids === "string"
      ? { where: { id: { in: ids.split(",").map(Number) } } }
      : {}),
  });
  // PNGs are skipped in the automatic pick: in this library they're graphics
  // (logos), not photos. ?ids= can still ask for one.
  const sized = docs.filter(
    (photo) =>
      photo.url &&
      photo.width &&
      photo.height &&
      (typeof ids === "string" || photo.mimeType !== "image/png"),
  );

  const photos: ComparePhoto[] = [];
  for (const [index, target] of TARGETS.entries()) {
    const pick =
      typeof ids === "string"
        ? sized[index]
        : sized
            .filter((photo) => !photos.some((picked) => picked.id === photo.id))
            .sort(
              (a, b) =>
                Math.abs(Math.log(a.width! / a.height! / target.aspect)) -
                Math.abs(Math.log(b.width! / b.height! / target.aspect)),
            )[0];
    if (!pick) continue;
    const aspect = pick.width! / pick.height!;
    // Within ~10% of the target shape counts as that shape; otherwise say so.
    const matches = Math.abs(Math.log(aspect / target.aspect)) < 0.1;
    photos.push({
      id: pick.id,
      label:
        typeof ids === "string"
          ? `Photo ${index + 1}`
          : matches
            ? target.label
            : `${target.label}: none in the library, closest is ${aspect.toFixed(2)}`,
      url: pick.url!,
      alt: pick.alt,
      width: pick.width!,
      height: pick.height!,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-gutter py-section">
      <div>
        <h1 className="font-display text-page text-ink">AVIF vs WebP</h1>
        <p className="mt-2 text-body text-muted">
          Dev-only. The same photos at gallery-tile size (4:5 frame, same{" "}
          <code>sizes</code> as the real gallery), both at quality 90 through Next&apos;s image
          optimizer. Under each tile: the width it fetched and the file size. Pick photos with{" "}
          <code>?ids=1,2,3</code>.
        </p>
      </div>
      {photos.length === 0 ? (
        <p className="text-body text-muted">No photos with a stored size found.</p>
      ) : (
        <FormatComparison photos={photos} />
      )}
    </div>
  );
}
