"use client";

import { useEffect, useRef, useState } from "react";
import { isLivePreviewEvent, mergeData, ready } from "@payloadcms/live-preview";

// The collection counterpart of useScopedLivePreview (the global version),
// per docs/collection-live-preview.md. A page often renders many documents
// from one collection (every category tile, every pricing card), and
// Payload's live-preview message carries the collection slug and the form
// values but not the document id. So the collection's
// admin.livePreview.url puts the id in the preview URL as `?lpDoc=<id>`,
// and only the rendered item whose id matches applies the messages; every
// other item keeps its server data.
//
// Only listens at all when this item is the one being previewed, so on the
// public site (no lpDoc) or for every other item it's inert. Server-side
// filtering and sorting don't re-run: changing show/hide or order only
// shows after saving, when RefreshRouteOnSave refreshes the page.
export const LIVE_PREVIEW_DOC_PARAM = "lpDoc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same constraint as useScopedLivePreview
export function useScopedCollectionLivePreview<T extends Record<string, any> & { id: number | string }>({
  initialData,
  serverURL,
  collectionSlug,
  apiRoute,
  depth,
}: {
  initialData: T;
  serverURL: string;
  collectionSlug: string;
  apiRoute?: string;
  depth?: number;
}): { data: T; live: boolean } {
  const [data, setData] = useState<T>(initialData);
  // Set once an unsaved update from the studio has been applied; never on
  // the public site (no Live Preview messages arrive there).
  const [live, setLive] = useState(false);
  const mergeBasis = useRef<T>(initialData);
  // mergeData is async (it may fetch relationships), so two quick edits can
  // finish out of order; only the newest message's result is kept, or an
  // older one would land last and leave the preview a keystroke behind.
  const latestMessage = useRef(0);
  const id = initialData.id;

  useEffect(() => {
    const previewedId = new URLSearchParams(window.location.search).get(LIVE_PREVIEW_DOC_PARAM);
    if (previewedId !== String(id)) return;

    const onMessage = async (event: MessageEvent) => {
      if (!isLivePreviewEvent(event, serverURL)) return;
      if (event.data.collectionSlug !== collectionSlug) return;

      const messageId = ++latestMessage.current;
      const merged = await mergeData<T>({
        apiRoute,
        collectionSlug,
        depth,
        incomingData: event.data.data,
        initialData: mergeBasis.current,
        locale: event.data.locale,
        serverURL,
      });
      if (messageId !== latestMessage.current) return;
      mergeBasis.current = merged;
      setData(merged);
      setLive(true);
    };

    window.addEventListener("message", onMessage);
    ready({ serverURL });
    return () => window.removeEventListener("message", onMessage);
  }, [id, serverURL, collectionSlug, apiRoute, depth]);

  // `live`: unsaved form data has arrived (we're in the studio's Live
  // Preview). Photos drawn from it skip the image optimizer, which fetches
  // without a session: a photo picked but not yet shown on the site isn't
  // public (lib/public-photos.ts), so the browser fetches it directly with
  // the admin's own session, and the optimizer caches nothing.
  return { data, live };
}
