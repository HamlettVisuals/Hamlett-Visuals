"use client";

import { useEffect, useRef, useState } from "react";
import {
  isLivePreviewEvent,
  mergeData,
  ready,
  type CollectionPopulationRequestHandler,
} from "@payloadcms/live-preview";

// A drop-in replacement for @payloadcms/live-preview-react's useLivePreview,
// scoped to one specific global by slug.
//
// Why this exists: the stock hook's subscribe()/handleMessage() doesn't
// filter incoming postMessages by which document they belong to — it merges
// *any* live-preview message into *every* mounted hook's data, and caches
// the merge result in a single module-level variable shared across all
// hook instances. That's fine for Payload's typical use case (one big
// document backing one whole page), but this site's homepage is composed of
// many small globals mounted at once (Hero, About, CategoriesIntro, ...),
// each with its own hook. With the stock hook, editing any one of them
// broadcasts a message every other mounted hook also receives and merges in
// — e.g. editing Hero would wipe About's rendered heading to empty, since
// Hero's field shape has no `heading` field. Confirmed via direct testing
// before this hook existed.
//
// The fix: check event.data.globalSlug against the slug this hook actually
// cares about before doing anything, and keep the merge basis in a
// per-instance ref instead of a shared singleton. Everything else
// (mergeData, ready()) reuses Payload's own live-preview primitives so
// relationship population still works exactly like the stock hook.
// matches the stock useLivePreview's own constraint; Payload's generated
// interfaces (Hero, About, ...) have no index signature, so
// Record<string, unknown> rejects them structurally even though they're
// valid plain objects.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useScopedLivePreview<T extends Record<string, any>>({
  initialData,
  serverURL,
  globalSlug,
  apiRoute,
  depth,
  requestHandler,
}: {
  initialData: T;
  serverURL: string;
  globalSlug: string;
  apiRoute?: string;
  depth?: number;
  requestHandler?: CollectionPopulationRequestHandler;
}): { data: T } {
  const [data, setData] = useState<T>(initialData);
  const mergeBasis = useRef<T>(initialData);
  // mergeData is async (it may fetch relationships), so two quick edits can
  // finish out of order; only the newest message's result is kept, or an
  // older one would land last and leave the preview a keystroke behind.
  const latestMessage = useRef(0);
  const hasSentReady = useRef(false);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!isLivePreviewEvent(event, serverURL)) return;
      if (event.data.globalSlug !== globalSlug) return;

      const messageId = ++latestMessage.current;
      const merged = await mergeData<T>({
        apiRoute,
        depth,
        globalSlug,
        incomingData: event.data.data,
        initialData: mergeBasis.current,
        locale: event.data.locale,
        requestHandler,
        serverURL,
      });
      if (messageId !== latestMessage.current) return;
      mergeBasis.current = merged;
      setData(merged);
    };

    window.addEventListener("message", onMessage);
    if (!hasSentReady.current) {
      hasSentReady.current = true;
      ready({ serverURL });
    }
    return () => window.removeEventListener("message", onMessage);
  }, [serverURL, globalSlug, apiRoute, depth, requestHandler]);

  return { data };
}
