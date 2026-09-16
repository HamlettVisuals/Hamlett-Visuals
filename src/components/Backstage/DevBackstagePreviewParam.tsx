"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

type DevBackstagePreviewParamProps = {
  onChange: (enabled: boolean) => void;
};

/**
 * Reads ?backstagePreview=1 so the grid/lightbox can be exercised against a
 * mix of fixture items before any admin-uploaded content exists — same
 * pattern as DevGalleryStateParam (src/components/Gallery/). Split out of
 * BackstageGallery (rather than calling useSearchParams there directly) so
 * the hook — and the Suspense boundary it requires — is only ever mounted in
 * development, where the parent renders this behind a
 * `process.env.NODE_ENV === "development"` check.
 */
export default function DevBackstagePreviewParam({
  onChange,
}: DevBackstagePreviewParamProps) {
  const searchParams = useSearchParams();
  const enabled = searchParams.get("backstagePreview") === "1";

  useEffect(() => {
    onChange(enabled);
  }, [enabled, onChange]);

  return null;
}
