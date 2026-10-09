"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkPhotoFile,
  checkVideoFile,
  createAlbumPhoto,
  createAlbumVideo,
  putInStorage,
  type StoredFile,
} from "./upload";

// The album page's upload queues (one for photos, one for videos): one tile
// per picked or dropped file, with its progress, until it's saved (the tile
// then gives way to the photo or video in the grid) or it fails (the tile
// says why until dismissed).
//
// One file at a time, in the order picked: each new one goes to the end of
// the album as it's saved, so the album ends up in that order, and two
// files of the same name never get the same name in R2 (the name is only
// made unique against what's already saved).

/** How one kind of file is checked, stored and saved (upload.ts). */
export type UploadSteps = {
  check: (file: File) => { file: File } | { error: string };
  put: (file: File, apiBase: string, onProgress: (fraction: number) => void) => Promise<StoredFile>;
  create: (file: File, stored: StoredFile, album: { apiBase: string; albumId: number; alt: string }) => Promise<{ id: number }>;
  /** Whether the tile can show the picked file itself (a browser can't show a video as an image). */
  preview: boolean;
};

export const PHOTO_UPLOADS: UploadSteps = {
  check: checkPhotoFile,
  put: (file, apiBase, onProgress) => putInStorage("photos", file, apiBase, onProgress),
  create: createAlbumPhoto,
  preview: true,
};

export const VIDEO_UPLOADS: UploadSteps = {
  check: checkVideoFile,
  put: (file, apiBase, onProgress) => putInStorage("videos", file, apiBase, onProgress),
  create: (file, stored, { apiBase, albumId }) => createAlbumVideo(file, stored, { apiBase, albumId }),
  preview: false,
};

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
  steps,
  apiBase,
  albumId,
  alt,
  onAdded,
}: {
  steps: UploadSteps;
  apiBase: string;
  albumId: number | null;
  /** Alt text for new photos, e.g. "Photo from Vacation" (videos don't use it). */
  alt: string;
  /** After each one is saved, with its id. */
  onAdded: (id: number) => Promise<void>;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const queue = useRef<Queued[]>([]);
  const running = useRef(false);
  // Read when each file is saved, so a title edited meanwhile is used.
  const latest = useRef({ steps, apiBase, albumId, alt, onAdded });
  useEffect(() => {
    latest.current = { steps, apiBase, albumId, alt, onAdded };
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
      const { steps: kind, apiBase: base, albumId: album } = latest.current;
      try {
        if (album == null) throw new Error("Save the album first.");
        update(key, { status: "uploading", progress: 0 });
        const stored = await kind.put(file, base, (progress) => update(key, { progress }));
        update(key, { status: "saving", progress: 1 });
        const saved = await kind.create(file, stored, { apiBase: base, albumId: album, alt: latest.current.alt });
        await latest.current.onAdded(saved.id);
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
        const checked = latest.current.steps.check(picked);
        if ("error" in checked) {
          added.push({ key, name: picked.name, preview: null, progress: 0, status: "error", error: checked.error });
          continue;
        }
        const preview = latest.current.steps.preview ? URL.createObjectURL(checked.file) : null;
        added.push({ key, name: picked.name, preview, progress: 0, status: "waiting" });
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
