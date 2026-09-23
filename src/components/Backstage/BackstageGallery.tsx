"use client";

import { useRef, useState } from "react";
import type { BackstageItem } from "@/lib/backstage-items";
import GalleryEmptyState from "@/components/Gallery/GalleryEmptyState";
import BackstageGrid from "./BackstageGrid";
import BackstageLightbox from "./BackstageLightbox";

type BackstageGalleryProps = {
  /** Already in display order (Payload's `order` field) — see page.tsx. */
  items: BackstageItem[];
};

export default function BackstageGallery({ items }: BackstageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // The tile button that opened the lightbox, so focus can return there on
  // close — same convention as FloatingAskButton's triggerRef.
  const openerRef = useRef<HTMLButtonElement | null>(null);

  // A "reel_embed" tile links straight out to Instagram (see BackstageGrid)
  // rather than opening the lightbox, so the lightbox only ever cycles
  // through the video items — its prev/next index math is scoped to this
  // subset, not the full grid.
  const videoItems = items.filter((item) => item.type === "video");

  function handleItemClick(item: BackstageItem, opener: HTMLButtonElement) {
    const index = videoItems.findIndex((video) => video.id === item.id);
    if (index === -1) return;
    openerRef.current = opener;
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  function handleClose() {
    setLightboxOpen(false);
    openerRef.current?.focus();
  }

  return (
    <>
      {items.length === 0 ? (
        <GalleryEmptyState message="Behind-the-scenes content coming soon." />
      ) : (
        <>
          <BackstageGrid items={items} onItemClick={handleItemClick} />
          <BackstageLightbox
            items={videoItems}
            isOpen={lightboxOpen}
            startIndex={lightboxIndex}
            onClose={handleClose}
          />
        </>
      )}
    </>
  );
}
