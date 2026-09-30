"use client";

import { useEffect, useRef } from "react";
import { useDocumentDrawer } from "@payloadcms/ui";

// A photo's own edit form (alt text, caption, replace the file, crop and
// focal point) in a drawer, over whatever page opened it: the album page's
// photo grid ("Edit photo details") and Unused photos on Categories &
// Albums. Opens as it mounts; the page unmounts it once it's closed
// (onClosed). onSaved runs after each save, so the page can show the change.
export default function EditPhotoDrawer({ id, onSaved, onClosed }: { id: number; onSaved: () => void; onClosed: () => void }) {
  const [DocumentDrawer, , { openDrawer, isDrawerOpen }] = useDocumentDrawer({ collectionSlug: "photos", id });
  const opened = useRef(false);

  useEffect(() => {
    openDrawer();
  }, [openDrawer]);

  useEffect(() => {
    if (isDrawerOpen) opened.current = true;
    else if (opened.current) onClosed();
  }, [isDrawerOpen, onClosed]);

  return <DocumentDrawer onSave={onSaved} />;
}
