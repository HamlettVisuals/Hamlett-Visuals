"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Drawer, useModal } from "@payloadcms/ui";
import GroupedList, { type GroupedListSection } from "@/components/admin/GroupedList";
import { compareAlbums, comparePhotos } from "@/lib/manual-order";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";

// "Add existing photos" on the album page: a drawer with every photo in
// the library, grouped category → album → photos (GroupedList), then the
// photos in no album ("Not in an album", e.g. category covers and site
// photos) and any whose album or category is in the Trash. This album's own
// photos are shown for reference but can't be picked.
//
// A photo belongs to one album at most, so picking one from another album
// moves it here: that album's heading says so, and the footer counts what
// will move out of where. Added photos go to the end of this album in the
// order they were picked (each is an ordinary photo save setting `event`,
// one after another, and Photos.ts puts a photo that joins an album at its
// end). Mounted by AlbumPhotos while it's open: it loads the library fresh
// (so it reflects what the grid just did), opens itself, and reports when
// it's closed. Styles: .add-photos in admin-overrides.css.

export const ADD_PHOTOS_DRAWER = "album-add-existing-photos";

type LibraryPhoto = {
  id: number;
  alt?: string | null;
  filename?: string | null;
  url?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
  event?: number | null;
  albumOrder?: string | null;
  createdAt?: string | null;
};
type LibraryAlbum = { id: number; title: string; category?: number | null; albumOrder?: string | null; createdAt?: string | null };
type LibraryCategory = { id: number; name: string; slug: string };
type Library = { categories: LibraryCategory[]; albums: LibraryAlbum[]; photos: LibraryPhoto[] };

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number }).id : (value as number | null | undefined);

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.errors?.[0]?.message ?? "Your photos couldn't be loaded.");
  return json as T;
}

export async function loadLibrary(apiBase: string): Promise<Library> {
  const all = (fields: string[]) =>
    new URLSearchParams([["pagination", "false"], ["depth", "0"], ...fields.map((f) => [`select${f}`, "true"])]).toString();
  const [categories, albums, photos] = await Promise.all([
    getJSON<{ docs: LibraryCategory[] }>(`${apiBase}/categories?sort=_order&${all(["[name]", "[slug]"])}`),
    getJSON<{ docs: LibraryAlbum[] }>(`${apiBase}/events?${all(["[title]", "[category]", "[albumOrder]", "[createdAt]"])}`),
    getJSON<{ docs: LibraryPhoto[] }>(
      // url and the thumbnail's url are built from filename, prefix and
      // the size's own file name (see AlbumPhotos' own query).
      `${apiBase}/photos?${all(["[alt]", "[filename]", "[prefix]", "[url]", "[sizes][thumbnail]", "[event]", "[albumOrder]", "[createdAt]"])}`,
    ),
  ]);
  return {
    categories: categories.docs.filter((c) => c.slug !== OTHER_SESSION_TYPE),
    albums: albums.docs.map((a) => ({ ...a, category: idOf(a.category) ?? null })),
    photos: photos.docs.map((p) => ({ ...p, event: idOf(p.event) ?? null })),
  };
}

const photoLabel = (photo: LibraryPhoto) => photo.alt?.trim() || photo.filename || "Photo";

export default function AddExistingPhotos({
  apiBase,
  albumId,
  onAdded,
  onClosed,
}: {
  apiBase: string;
  albumId: number;
  /** After the photos are added (or some were, before a failure). */
  onAdded: () => Promise<void>;
  onClosed: () => void;
}) {
  const { closeModal, isModalOpen, openModal } = useModal();
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [adding, setAdding] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    openModal(ADD_PHOTOS_DRAWER);
    loadLibrary(apiBase).then(setLibrary, (err: unknown) =>
      setLoadError(err instanceof Error ? err.message : "Your photos couldn't be loaded."),
    );
  }, [apiBase, openModal]);

  const isOpen = isModalOpen(ADD_PHOTOS_DRAWER);
  const opened = useRef(false);
  useEffect(() => {
    if (isOpen) opened.current = true;
    else if (opened.current) onClosed();
  }, [isOpen, onClosed]);

  const togglePick = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const albumsById = new Map((library?.albums ?? []).map((album) => [album.id, album]));
  const photoById = new Map((library?.photos ?? []).map((photo) => [photo.id, photo]));

  // What moves out of which album, in words: "2 will move out of 'A'".
  const moving = new Map<number, number>();
  for (const id of picked) {
    const from = photoById.get(id)?.event;
    if (from != null && from !== albumId) moving.set(from, (moving.get(from) ?? 0) + 1);
  }
  const movingText = [...moving.entries()]
    .map(([from, count], i) => `${count}${i === 0 ? " will move" : ""} out of “${albumsById.get(from)?.title ?? "a deleted album"}”`)
    .join(", ");

  const add = async () => {
    const ids = [...picked];
    setError(null);
    setAdding({ done: 0, total: ids.length });
    let done = 0;
    try {
      for (const id of ids) {
        const res = await fetch(`${apiBase}/photos/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: albumId }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.errors?.[0]?.message ?? "Something went wrong.");
        done += 1;
        setAdding({ done, total: ids.length });
      }
    } catch (err) {
      setError(
        `${done ? `${done} of ${ids.length} added, then ` : ""}the photo “${photoLabel(photoById.get(ids[done]) ?? { id: 0 })}” couldn't be added: ${
          err instanceof Error ? err.message : ""
        }`,
      );
      setPicked(ids.slice(done));
      setAdding(null);
      await onAdded();
      return;
    }
    setAdding(null);
    setPicked([]);
    await onAdded();
    closeModal(ADD_PHOTOS_DRAWER);
  };

  const grid = (photos: LibraryPhoto[]) => (
    <ul className="add-photos__grid">
      {photos.map((photo) => {
        const here = photo.event === albumId;
        const index = picked.indexOf(photo.id);
        const src = photo.sizes?.thumbnail?.url || photo.url;
        return (
          <li key={photo.id}>
            <button
              type="button"
              className={`add-photos__photo${index >= 0 ? " add-photos__photo--picked" : ""}${here ? " add-photos__photo--here" : ""}`}
              aria-pressed={here ? undefined : index >= 0}
              disabled={here || adding !== null}
              title={here ? "Already in this album" : photoLabel(photo)}
              onClick={() => togglePick(photo.id)}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from the media store
                <img src={src} alt={photoLabel(photo)} loading="lazy" />
              ) : (
                <span className="add-photos__no-preview">{photoLabel(photo)}</span>
              )}
              {here && <span className="add-photos__badge">In this album</span>}
              {index >= 0 && (
                <span className="add-photos__check" aria-hidden="true">
                  {index + 1}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  let sections: GroupedListSection[] = [];
  if (library) {
    const photosByAlbum = new Map<number, LibraryPhoto[]>();
    const loose: LibraryPhoto[] = [];
    const orphaned: LibraryPhoto[] = [];
    for (const photo of library.photos) {
      if (photo.event == null) loose.push(photo);
      else if (!albumsById.has(photo.event)) orphaned.push(photo);
      else photosByAlbum.set(photo.event, [...(photosByAlbum.get(photo.event) ?? []), photo]);
    }
    const listedCategories = new Set(library.categories.map((c) => c.id));
    const albumSection = (album: LibraryAlbum): GroupedListSection => {
      const photos = (photosByAlbum.get(album.id) ?? []).toSorted(comparePhotos);
      return {
        key: `album-${album.id}`,
        title: album.title,
        count: photos.length,
        note: album.id === albumId ? "This album" : photos.length ? "Picking moves them here" : undefined,
        emptyText: "No photos",
        children: grid(photos),
      };
    };
    const sortedAlbums = library.albums.toSorted(compareAlbums);
    sections = library.categories
      .map((category): GroupedListSection | null => {
        const albums = sortedAlbums.filter((album) => album.category === category.id);
        if (!albums.length) return null;
        const count = albums.reduce((sum, album) => sum + (photosByAlbum.get(album.id)?.length ?? 0), 0);
        return {
          key: `category-${category.id}`,
          title: category.name,
          count,
          emptyText: "No photos in its albums yet",
          children: <GroupedList sections={albums.map(albumSection)} />,
        };
      })
      .filter((section): section is GroupedListSection => section !== null);
    // Albums whose category is in the Trash.
    const stray = sortedAlbums.filter((album) => album.category == null || !listedCategories.has(album.category));
    const strayPhotos = stray.flatMap((album) => photosByAlbum.get(album.id) ?? []);
    if (strayPhotos.length) {
      sections.push({
        key: "albums-in-deleted-categories",
        title: "Albums in deleted categories",
        count: strayPhotos.length,
        emptyText: "",
        children: <GroupedList sections={stray.map(albumSection)} />,
      });
    }
    sections.push({
      key: "not-in-an-album",
      title: "Not in an album",
      count: loose.length,
      note: "Site photos and photos taken out of albums",
      emptyText: "Every photo is in an album.",
      children: grid(loose.toSorted(comparePhotos)),
    });
    if (orphaned.length) {
      sections.push({
        key: "in-deleted-albums",
        title: "In deleted albums",
        count: orphaned.length,
        note: "Picking moves them here",
        emptyText: "",
        children: grid(orphaned.toSorted(comparePhotos)),
      });
    }
  }

  return (
    <Drawer slug={ADD_PHOTOS_DRAWER} className="add-photos" title="Add existing photos">
      <p className="add-photos__intro">
        Pick photos from your library to add to this album. A photo is in one album at most, so picking one from another
        album moves it here. They go to the end, in the order you pick them.
      </p>
      {loadError ? (
        <p className="album-photos__error" role="alert">
          {loadError}
        </p>
      ) : !library ? (
        <p className="add-photos__loading">Loading your photos…</p>
      ) : (
        <GroupedList sections={sections} />
      )}

      <div className="add-photos__footer">
        {error && (
          <p className="album-photos__error add-photos__error" role="alert">
            {error}
          </p>
        )}
        <div className="add-photos__summary" aria-live="polite">
          {adding
            ? `Adding ${adding.done + 1 > adding.total ? adding.total : adding.done + 1} of ${adding.total}…`
            : picked.length
              ? `${picked.length} picked${movingText ? ` · ${movingText}` : ""}`
              : "Nothing picked yet"}
        </div>
        <div className="add-photos__buttons">
          <Button buttonStyle="secondary" size="medium" margin={false} disabled={adding !== null} onClick={() => closeModal(ADD_PHOTOS_DRAWER)}>
            Cancel
          </Button>
          <Button buttonStyle="primary" size="medium" margin={false} disabled={!picked.length || adding !== null} onClick={() => void add()}>
            {picked.length > 1 ? `Add ${picked.length} photos` : "Add photo"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
