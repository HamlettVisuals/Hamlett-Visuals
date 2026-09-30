"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer, useConfig, useModal } from "@payloadcms/ui";
import GroupedList, { type GroupedListSection } from "@/components/admin/GroupedList";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";
import { compareAlbums } from "@/lib/manual-order";

// "Add to album…" from Unused photos: pick one album, grouped by category
// (in her order) with each category's albums in her order, and a search by
// album title for when there are many. Hidden albums are listed and marked;
// categories with no albums are left out.
// Mounted while it's open (as AddExistingPhotos.tsx is): it loads the
// albums fresh, opens itself, and reports when it's closed. Picking an
// album closes it and hands the album to the page, which adds the photos.
// Styles: .album-picker in admin-overrides.css.

export const ALBUM_PICKER_DRAWER = "unused-photos-album-picker";

export type PickedAlbum = { id: number; title: string };
type Album = { id: number; title: string; category?: number | { id: number } | null; published?: boolean; albumOrder?: string | null; createdAt?: string | null };
type Category = { id: number; name: string; slug: string };

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number }).id : (value as number | null | undefined);

export default function AlbumPicker({
  count,
  onPick,
  onClosed,
}: {
  /** How many photos are being added, for the heading. */
  count: number;
  onPick: (album: PickedAlbum) => void;
  onClosed: () => void;
}) {
  const { config } = useConfig();
  const { closeModal, isModalOpen, openModal } = useModal();
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  const [data, setData] = useState<{ categories: Category[]; albums: Album[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    openModal(ALBUM_PICKER_DRAWER);
    const get = (url: string) =>
      fetch(url, { credentials: "include" }).then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.errors?.[0]?.message ?? "Your albums couldn't be loaded.");
        return json.docs;
      });
    Promise.all([
      get(`${apiBase}/categories?sort=_order&pagination=false&depth=0&select[name]=true&select[slug]=true`),
      get(`${apiBase}/events?pagination=false&depth=0&select[title]=true&select[category]=true&select[published]=true&select[albumOrder]=true&select[createdAt]=true`),
    ]).then(
      ([categories, albums]) => setData({ categories: (categories as Category[]).filter((c) => c.slug !== OTHER_SESSION_TYPE), albums }),
      (err: unknown) => setError(err instanceof Error ? err.message : "Your albums couldn't be loaded."),
    );
  }, [apiBase, openModal]);

  const isOpen = isModalOpen(ALBUM_PICKER_DRAWER);
  const opened = useRef(false);
  useEffect(() => {
    if (isOpen) opened.current = true;
    else if (opened.current) onClosed();
  }, [isOpen, onClosed]);

  const pick = (album: Album) => {
    closeModal(ALBUM_PICKER_DRAWER);
    onPick({ id: album.id, title: album.title });
  };

  const query = search.trim().toLowerCase();
  const sections: GroupedListSection[] = (data?.categories ?? [])
    .map((category) => {
      const albums = (data?.albums ?? [])
        .filter((album) => idOf(album.category) === category.id)
        .filter((album) => !query || album.title.toLowerCase().includes(query))
        .toSorted(compareAlbums);
      return {
        key: `category-${category.id}`,
        title: category.name,
        count: albums.length,
        emptyText: "",
        children: (
          <ul className="album-picker__list">
            {albums.map((album) => (
              <li key={album.id}>
                <button type="button" className="album-picker__album" onClick={() => pick(album)}>
                  <span className="album-picker__title">{album.title}</span>
                  {album.published === false && <span className="album-picker__hidden">Hidden</span>}
                </button>
              </li>
            ))}
          </ul>
        ),
      };
    })
    // Categories with no album (or none matching) have nothing to pick.
    .filter((section) => section.count > 0);

  return (
    <Drawer slug={ALBUM_PICKER_DRAWER} className="album-picker" title={count === 1 ? "Add the photo to an album" : `Add ${count} photos to an album`}>
      <p className="album-picker__intro">They go to the end of the album you pick, in the order you picked them.</p>
      <input
        type="search"
        className="unused-photos__search album-picker__search"
        placeholder="Search albums"
        aria-label="Search albums"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {error ? (
        <p className="portfolio__error" role="alert">
          {error}
        </p>
      ) : !data ? (
        <p className="add-photos__loading">Loading your albums…</p>
      ) : sections.length === 0 ? (
        <p className="add-photos__loading">{query ? `No album called “${search.trim()}”.` : "No albums yet. Add one from Categories & Albums."}</p>
      ) : (
        <GroupedList sections={sections} />
      )}
    </Drawer>
  );
}
