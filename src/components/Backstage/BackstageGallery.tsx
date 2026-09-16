"use client";

import { Suspense, useRef, useState } from "react";
import type { BackstageItem } from "@/lib/backstage-items";
import GalleryEmptyState from "@/components/Gallery/GalleryEmptyState";
import BackstageGrid from "./BackstageGrid";
import BackstageLightbox from "./BackstageLightbox";
import DevBackstagePreviewParam from "./DevBackstagePreviewParam";
import { PREVIEW_BACKSTAGE_ITEMS } from "./backstagePreviewItems";

type BackstageGalleryProps = {
  items: BackstageItem[];
};

export default function BackstageGallery({ items }: BackstageGalleryProps) {
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // The tile button that opened the lightbox, so focus can return there on
  // close — same convention as FloatingAskButton's triggerRef.
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const source = previewEnabled ? PREVIEW_BACKSTAGE_ITEMS : items;
  const sorted = [...source].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );

  function handleItemClick(index: number, opener: HTMLButtonElement) {
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
      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <DevBackstagePreviewParam onChange={setPreviewEnabled} />
        </Suspense>
      )}

      {sorted.length === 0 ? (
        <GalleryEmptyState message="Behind-the-scenes content coming soon." />
      ) : (
        <>
          <BackstageGrid items={sorted} onItemClick={handleItemClick} />
          <BackstageLightbox
            items={sorted}
            isOpen={lightboxOpen}
            startIndex={lightboxIndex}
            onClose={handleClose}
          />
        </>
      )}
    </>
  );
}
