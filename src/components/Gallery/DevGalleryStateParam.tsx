"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export type DevGalleryState = "empty" | "loading" | "sparse" | "video" | null;

type DevGalleryStateParamProps = {
  onChange: (state: DevGalleryState) => void;
};

/**
 * Reads ?galleryState=empty|loading|sparse|video so CategoryGallery's
 * loading/empty/sparse states can be previewed before real async fetching
 * exists, and an album video without uploading one ("video": a sample on
 * the first album, see CategoryGallery).
 * Split out of CategoryGallery (rather than calling useSearchParams there
 * directly) so the hook — and the Suspense boundary it requires — is only
 * ever mounted in development, where the parent renders this behind a
 * `process.env.NODE_ENV === "development"` check: CategoryGallery itself
 * stays hook-free for this param and unaffected outside of dev.
 */
export default function DevGalleryStateParam({
  onChange,
}: DevGalleryStateParamProps) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("galleryState");
  const state: DevGalleryState =
    raw === "empty" || raw === "loading" || raw === "sparse" || raw === "video" ? raw : null;

  useEffect(() => {
    onChange(state);
  }, [state, onChange]);

  return null;
}
