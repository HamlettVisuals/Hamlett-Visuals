import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import BackstageGallery from "@/components/Backstage/BackstageGallery";
import { isVideoMimeType } from "@/lib/backstage-limits";
import { uploadFocal, uploadUrl, type BackstageItem } from "@/lib/backstage-items";

// Backstage feed — a single continuous grid of the photos and video clips
// uploaded in the studio (collections/Backstage.ts), in her drag order
// (newest at the top unless she moves them), no category split. Mirrors the
// shell of the other sub-pages (/testimonials, /terms, /privacy-policy);
// the grid, lightbox and empty state live in src/components/Backstage/.
// Item-scoped Live Preview: Backstage.ts's livePreview.url points here with
// `?lpDoc=<id>`, and that one tile follows the unsaved title, caption and
// thumbnail (BackstageGrid.tsx). RefreshRouteOnSave (mounted in
// (site)/layout.tsx) refreshes the page on save.

export const metadata = {
  title: "Backstage — Hamlett Visuals",
};

export default async function BackstagePage() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "backstage",
    where: { published: { equals: true } },
    sort: "_order",
    depth: 1,
    limit: 0,
  });

  const items: BackstageItem[] = docs
    .filter((doc) => doc.url)
    .map((doc) => {
      const isVideo = isVideoMimeType(doc.mimeType);
      return {
        id: String(doc.id),
        kind: isVideo ? "video" : "photo",
        mediaUrl: isVideo ? (doc.url ?? null) : null,
        imageUrl: isVideo ? uploadUrl(doc.poster) : (doc.url ?? null),
        imageFocal: isVideo ? uploadFocal(doc.poster) : uploadFocal(doc),
        title: doc.title ?? "",
        caption: doc.caption,
      };
    });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-gutter py-section">
      <header>
        <h1 className="font-display text-page italic text-ink">Backstage</h1>
        <p className="mt-3 max-w-measure text-body text-accent-text">
          A running feed from behind the camera — process shots, reels, and
          the moments between the moments.
        </p>
      </header>

      <div id="backstage-feed" className="mt-12">
        <BackstageGallery items={items} />
      </div>

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
