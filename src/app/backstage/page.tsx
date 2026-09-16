import Link from "next/link";
import { backstageItems } from "@/lib/backstage-items";
import BackstageGallery from "@/components/Backstage/BackstageGallery";

// Backstage feed — a single continuous, unbounded grid of admin-uploaded
// photos and video, newest first, no category split. Mirrors the shell of
// the other sub-pages (/testimonials, /terms, /privacy-policy); the grid,
// lightbox and empty state live in src/components/Backstage/.

export const metadata = {
  title: "Backstage — Hamlett Visuals",
};

export default function BackstagePage() {
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
        <BackstageGallery items={backstageItems} />
      </div>

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
