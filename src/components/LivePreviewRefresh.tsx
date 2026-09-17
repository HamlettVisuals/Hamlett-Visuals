"use client";

import { useRouter } from "next/navigation";
import { RefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { serverURL } from "@/lib/server-url";

// Refetches server-rendered content when a document is saved/published from
// inside the Live Preview iframe — a router.refresh(), not a full page
// reload. This is separate from useLivePreview() (used by components like
// Hero that need to react to every keystroke, not just saves): most
// sections aren't wired to Payload yet, so a save won't currently change
// anything they render, but this is what will pick that up once they are.
export default function LivePreviewRefresh() {
  const router = useRouter();

  return (
    <RefreshRouteOnSave
      serverURL={serverURL}
      apiRoute="/hv-studio/api"
      refresh={() => router.refresh()}
    />
  );
}
