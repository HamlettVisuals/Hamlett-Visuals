"use client";

import { useEffect } from "react";
import { useConfig, useDocumentInfo, useDocumentTitle, useTranslation } from "@payloadcms/ui";

// A new, not-yet-titled document's heading reads "New album" rather than
// Payload's "[Untitled]". Payload sets the heading from the title field in
// a few places (on load and as the field changes), so this watches the
// heading and swaps only that placeholder, only before the first save.
// Typing a title replaces it as usual. Mounted through the collection's
// edit.beforeDocumentControls (Albums, Categories, Packages, Backstage).
//
// Before the first save it also leaves a hidden marker inside Payload's
// document controls, which admin-overrides.css uses to drop Payload's
// "Creating new Album" line there: the heading already says it.
export default function NewDocumentTitle() {
  const { id, collectionSlug } = useDocumentInfo();
  const { title, setDocumentTitle } = useDocumentTitle();
  const { config } = useConfig();
  const { t } = useTranslation();
  const untitled = `[${t("general:untitled")}]`;
  const singular = config.collections.find((c) => c.slug === collectionSlug)?.labels?.singular;
  const newTitle = `New ${typeof singular === "string" ? singular.toLowerCase() : "item"}`;

  // A frame later, after Payload's own effects have set the heading.
  useEffect(() => {
    if (id || title !== untitled) return;
    const frame = requestAnimationFrame(() => setDocumentTitle(newTitle));
    return () => cancelAnimationFrame(frame);
  }, [id, title, untitled, newTitle, setDocumentTitle]);

  // `data-titled` stays off while the heading still says "[Untitled]" (the
  // server-rendered page, and the frame before the swap above), and
  // admin-overrides.css keeps the heading hidden until then.
  return id ? null : <span className="new-document-marker" data-titled={title !== untitled || undefined} hidden />;
}
