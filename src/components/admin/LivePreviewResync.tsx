"use client";

import { useEffect, useRef } from "react";
import {
  useAllFormFields,
  useDocumentInfo,
  useLivePreviewContext,
  useLocale,
} from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";

// Re-sends the editor's current (unsaved) values to the Live Preview
// whenever the preview reports "ready".
//
// Payload's own sender (LivePreviewWindow in @payloadcms/ui) posts the form
// values when the form changes or when the preview first becomes ready, and
// its ready flag stays true after that. When the preview page reloads (a
// link clicked inside it, a dropped connection, or a dev-server recompile
// doing a full reload), the reloaded page says "ready" again, but the flag
// is already true and the URL is unchanged, so nothing is re-sent: the
// preview shows the saved version until the next edit. Answering every
// "ready" here closes that gap. The message has the same shape as Payload's,
// so the site's hooks (lib/use-scoped-live-preview.ts and the collection
// variant) treat it like any other update.
//
// Each section on the page reports "ready" as it mounts, so a load produces
// a burst of them; one send shortly after the last one covers them all.
// Mounted by PreviewSizeButtons, which is on every Live Preview screen.

const SETTLE_MS = 150;

export default function LivePreviewResync() {
  const { iframeRef, isLivePreviewing, popupRef, previewWindowType, url } = useLivePreviewContext();
  const [formState] = useAllFormFields();
  const { id, collectionSlug, globalSlug } = useDocumentInfo();
  const locale = useLocale();

  // Read at send time, so the listener below doesn't re-subscribe on every
  // keystroke.
  const latest = useRef({ formState, id, collectionSlug, globalSlug, locale: locale?.code });
  useEffect(() => {
    latest.current = { formState, id, collectionSlug, globalSlug, locale: locale?.code };
  });

  useEffect(() => {
    if (!isLivePreviewing || !url) return;
    const target = () =>
      previewWindowType === "popup" ? popupRef?.current : iframeRef?.current?.contentWindow;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMessage = (event: MessageEvent) => {
      if (!url.startsWith(event.origin)) return;
      if (event.source !== target()) return;
      if (event.data?.type !== "payload-live-preview" || !event.data.ready) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { formState, id, collectionSlug, globalSlug, locale } = latest.current;
        if (!formState) return;
        const data = reduceFieldsToValues(formState, true);
        if (!data.id) data.id = id;
        target()?.postMessage(
          { type: "payload-live-preview", collectionSlug, data, globalSlug, locale },
          url,
        );
      }, SETTLE_MS);
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [iframeRef, isLivePreviewing, popupRef, previewWindowType, url]);

  return null;
}
