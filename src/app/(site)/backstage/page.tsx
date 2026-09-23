import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import BackstageGallery from "@/components/Backstage/BackstageGallery";
import { resolvePhoto } from "@/lib/resolve-photo";
import type { BackstageItem } from "@/lib/backstage-items";

// Backstage feed — a single continuous, unbounded grid of admin-uploaded
// video clips and linked Instagram Reels, in manual `order`, no category
// split. Mirrors the shell of the other sub-pages (/testimonials, /terms,
// /privacy-policy); the grid, lightbox and empty state live in
// src/components/Backstage/. Plain Live Preview only (see the "backstage"
// entry in payload.config.ts's livePreview.collections) — same as
// Categories/Events/Photos/Testimonials: RefreshRouteOnSave (mounted in
// (site)/layout.tsx) refreshes this page with fresh server data on save,
// no scroll-to-highlight or per-record targeting.

export const metadata = {
  title: "Backstage — Hamlett Visuals",
};

export default async function BackstagePage() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "backstage",
    where: { published: { equals: true } },
    sort: "order",
    depth: 1,
    limit: 0,
  });

  const items: BackstageItem[] = docs.map((doc) => {
    const thumbnail = resolvePhoto(doc.thumbnail);
    return {
      id: String(doc.id),
      type: doc.type,
      mediaUrl: doc.type === "video" ? (doc.url ?? null) : null,
      thumbnailUrl: thumbnail?.url ?? "",
      reelUrl: doc.type === "reel_embed" ? (doc.reelUrl ?? null) : null,
      title: doc.title,
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

      <div className="mt-12">
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
