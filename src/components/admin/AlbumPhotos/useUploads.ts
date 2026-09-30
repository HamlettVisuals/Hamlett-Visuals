"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkPhotoFile, createAlbumPhoto, putPhotoInStorage } from "./upload";

// The album page's upload queue: one tile per picked or dropped file, with
// its progress, until its photo is saved (the tile then gives way to the
// photo in the grid) or it fails (the tile says why until dismissed).
//
// One file at a time, in the order picked: each new photo goes to the end
// of the album as it's saved, so the album ends up in that order, and two
// files of the same name never get the same name in R2 (the name is only
// made unique against photos already saved).

export type UploadItem = {
  key: string;
  name: string;
  /** A local preview (browsers can't show every type; the tile copes). */
  preview: string | null;
  /** 0 to 1, the file's upload to R2. */
  progress: number;
  status: "waiting" | "uploading" | "saving" | "error";
  error?: string;
};

type Queued = { key: string; file: File };

let nextKey = 0;

export function useUploads({
  apiBase,
  albumId,
  alt,
  onPhotoAdded,
}: {
  apiBase: string;
  albumId: number | null;
  /** Alt text for new photos, e.g. "Photo from Vacation". */
  alt: string;
  onPhotoAdded: () => Promise<void>;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const queue = useRef<Queued[]>([]);
  const running = useRef(false);
  // Read when each file is saved, so a title edited meanwhile is used.
  const latest = useRef({ apiBase, albumId, alt, onPhotoAdded });
  useEffect(() => {
    latest.current = { apiBase, albumId, alt, onPhotoAdded };
  });

  const update = (key: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const remove = useCallback((key: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.key === key);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.key !== key);
    });
  }, []);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const { key, file } = queue.current.shift() as Queued;
      const { apiBase: base, albumId: album } = latest.current;
      try {
        if (album == null) throw new Error("Save the album first.");
        update(key, { status: "uploading", progress: 0 });
        const stored = await putPhotoInStorage(file, base, (progress) => update(key, { progress }));
        update(key, { status: "saving", progress: 1 });
        await createAlbumPhoto(file, stored, { apiBase: base, albumId: album, alt: latest.current.alt });
        await latest.current.onPhotoAdded();
        remove(key);
      } catch (err) {
        update(key, { status: "error", error: err instanceof Error ? err.message : "The upload failed." });
      }
    }
    running.current = false;
  }, [remove]);

  const add = useCallback(
    (files: File[]) => {
      const added: UploadItem[] = [];
      for (const picked of files) {
        const key = `upload-${++nextKey}`;
        const checked = checkPhotoFile(picked);
        if ("error" in checked) {
          added.push({ key, name: picked.name, preview: null, progress: 0, status: "error", error: checked.error });
          continue;
        }
        added.push({ key, name: picked.name, preview: URL.createObjectURL(checked.file), progress: 0, status: "waiting" });
        queue.current.push({ key, file: checked.file });
      }
      setItems((prev) => [...prev, ...added]);
      void run();
    },
    [run],
  );

  const active = items.some((item) => item.status !== "error");

  // Leaving the page mid-upload would drop the rest of the queue.
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  return { items, add, dismiss: remove, active };
}
