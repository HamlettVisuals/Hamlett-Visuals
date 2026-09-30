"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmationModal, MoreIcon, Popup, PopupList, toast, useConfig, useModal } from "@payloadcms/ui";
import EditPhotoDrawer from "@/components/admin/EditPhotoDrawer";
import type { UnusedPhoto } from "@/lib/photo-usage";
import AlbumPicker, { type PickedAlbum } from "./AlbumPicker";

// "Unused photos" at the bottom of Categories & Albums: photos in no album
// and not used anywhere on the site (lib/photo-usage.ts), e.g. one taken out
// of an album, a replaced cover, or an upload never used. Muted and closed
// to start; its photos load when it's first opened (GET
// /api/photos/unused), so the page itself stays quick, and again after a
// change. Its own search (alt text, caption, file name; an album upload's
// alt text names the album) and sort (newest, oldest, name), each photo
// with its upload date. Shows 60 at a time with "Show more"; search and
// sort cover every unused photo, not just those showing.
//
// Each tile: the photo opens its edit form in a drawer (EditPhotoDrawer,
// the album page's "Edit photo details"), and the tile shows the change
// once it's saved; the ring picks it; its ⋯ menu has Edit photo details,
// Add to album… and Move to Trash. With photos picked, the bar at the
// bottom does the same for all of them.
//
// Add to album…: pick an album (AlbumPicker.tsx); the photos are put in it
// one ordinary photo save at a time, in the order they were picked, so
// they land at its end in that order (Photos.ts), and then leave this
// section (they're in an album now).
//
// Move to Trash: POST /api/photos/trash-unused, which checks each photo is
// still unused first (one added to an album or used since the page loaded
// is left alone, and she's told). From the Trash tab they can be restored
// or deleted for good. Opens by itself for a #unused-photos link (a
// photo's ✕ when it's in no album). Styles: .unused-photos in
// admin-overrides.css.

const PAGE = 60;
const MODAL = "unused-photos-trash";
export const UNUSED_PHOTOS_ID = "unused-photos";

type Sort = "newest" | "oldest" | "name";

const nameOf = (photo: UnusedPhoto) => photo.alt?.trim() || photo.filename || `Photo ${photo.id}`;
const dateOf = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const photosText = (n: number) => (n === 1 ? "1 photo" : `${n} photos`);

export default function UnusedPhotos({ count }: { count: number }) {
  const { config } = useConfig();
  const router = useRouter();
  const { openModal } = useModal();
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<UnusedPhoto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [shown, setShown] = useState(PAGE);
  // Insertion order is the order she picked them in.
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  // What the Trash confirmation and the album picker act on: the picked
  // photos, or the one photo whose menu was used.
  const [trashIds, setTrashIds] = useState<number[]>([]);
  const [albumIds, setAlbumIds] = useState<number[] | null>(null);

  const load = useCallback(
    () =>
      fetch(`${apiBase}/photos/unused`, { credentials: "include" })
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          if (!res.ok) throw new Error(json?.error ?? "The unused photos couldn't be loaded.");
          setPhotos(json.photos as UnusedPhoto[]);
          setLoadError(null);
        })
        .catch((err: Error) => setLoadError(err.message)),
    [apiBase],
  );

  const openSection = () => {
    setOpen(true);
    if (photos === null) void load();
  };

  // A #unused-photos link opens the section and scrolls to it.
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash !== `#${UNUSED_PHOTOS_ID}`) return;
      openSection();
      requestAnimationFrame(() => document.getElementById(UNUSED_PHOTOS_ID)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- opening loads once; openSection reads current state
  }, []);

  const matching = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = (photos ?? []).filter(
      (photo) => !query || [photo.alt, photo.caption, photo.filename].some((text) => text?.toLowerCase().includes(query)),
    );
    if (sort === "name") return list.toSorted((a, b) => nameOf(a).localeCompare(nameOf(b), "en", { sensitivity: "base" }));
    const time = (photo: UnusedPhoto) => Date.parse(photo.createdAt) || 0;
    return list.toSorted((a, b) => (sort === "newest" ? time(b) - time(a) : time(a) - time(b)));
  }, [photos, search, sort]);
  const visible = matching.slice(0, shown);
  const allShownPicked = visible.length > 0 && visible.every((photo) => picked.has(photo.id));
  const byId = useMemo(() => new Map((photos ?? []).map((photo) => [photo.id, photo])), [photos]);

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const unpick = (ids: number[]) =>
    setPicked((prev) => new Set([...prev].filter((id) => !ids.includes(id))));

  // After any change: this list again, and the page (its count).
  const refresh = async () => {
    await load();
    router.refresh();
  };

  const askToTrash = (ids: number[]) => {
    setTrashIds(ids);
    openModal(MODAL);
  };

  const moveToTrash = async () => {
    const ids = trashIds;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/photos/trash-unused`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? json?.errors?.[0]?.message ?? "Something went wrong.");
      const { trashed, skipped } = json as { trashed: number[]; skipped: number[] };
      if (trashed.length) toast.success(`${photosText(trashed.length)} moved to the Trash.`);
      if (skipped.length) {
        toast.warning(
          `${skipped.length === 1 ? "1 photo was" : `${skipped.length} photos were`} left alone: added to an album or used on the site since this page loaded.`,
        );
      }
      unpick(ids);
    } catch (err) {
      toast.error(`Nothing was moved to the Trash: ${err instanceof Error ? err.message : ""}`);
    } finally {
      setBusy(false);
      setTrashIds([]);
      await refresh();
    }
  };

  // Each photo is an ordinary save setting its album, one after another in
  // the order picked, so they land at the album's end in that order.
  const addToAlbum = async (album: PickedAlbum, ids: number[]) => {
    setBusy(true);
    let done = 0;
    try {
      for (const id of ids) {
        const res = await fetch(`${apiBase}/photos/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: album.id }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.errors?.[0]?.message ?? "Something went wrong.");
        done += 1;
      }
      toast.success(`${photosText(done)} added to ${album.title}.`);
    } catch (err) {
      const photo = byId.get(ids[done]);
      toast.error(
        `${done ? `${photosText(done)} added to ${album.title}, then ` : ""}“${photo ? nameOf(photo) : "a photo"}” couldn't be added: ${
          err instanceof Error ? err.message : ""
        }`,
      );
    } finally {
      unpick(ids.slice(0, done));
      setBusy(false);
      await refresh();
    }
  };

  const total = photos?.length ?? count;
  const pickedIds = [...picked];
  const closeEditor = useCallback(() => setEditing(null), []);
  const closePicker = useCallback(() => setAlbumIds(null), []);

  return (
    <section
      id={UNUSED_PHOTOS_ID}
      className={`portfolio__section portfolio__section--muted unused-photos${open ? " portfolio__section--open" : ""}`}
    >
      <div className="portfolio__head">
        <span className="portfolio__handle-slot" />
        <button
          type="button"
          className="portfolio__toggle portfolio__toggle--static unused-photos__toggle"
          aria-expanded={open}
          aria-controls={`${UNUSED_PHOTOS_ID}-body`}
          onClick={() => (open ? setOpen(false) : openSection())}
        >
          <span className="portfolio__chevron" aria-hidden="true" />
          <span className="portfolio__name">Unused photos</span>
          <span className="portfolio__count">{total}</span>
          <span className="portfolio__note">In no album and not used anywhere on your site</span>
        </button>
      </div>

      {open && (
        <div id={`${UNUSED_PHOTOS_ID}-body`} className="portfolio__body unused-photos__body">
          {loadError ? (
            <p className="portfolio__error" role="alert">
              {loadError}
            </p>
          ) : photos === null ? (
            <p className="portfolio__empty">Loading photos…</p>
          ) : photos.length === 0 ? (
            <p className="portfolio__empty">
              Every photo is in an album or used on your site. Photos taken out of albums, or no longer used as a cover
              or elsewhere, show up here.
            </p>
          ) : (
            <>
              <div className="unused-photos__tools">
                <input
                  type="search"
                  className="unused-photos__search"
                  placeholder="Search alt text, caption or file name"
                  aria-label="Search unused photos"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setShown(PAGE);
                  }}
                />
                <label className="unused-photos__sort">
                  <span>Sort</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">Name</option>
                  </select>
                </label>
              </div>

              {matching.length === 0 ? (
                <p className="portfolio__empty">No unused photo matches &ldquo;{search.trim()}&rdquo;.</p>
              ) : (
                <>
                  <label className="unused-photos__select-all">
                    <input
                      type="checkbox"
                      checked={allShownPicked}
                      onChange={() =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          for (const photo of visible) {
                            if (allShownPicked) next.delete(photo.id);
                            else next.add(photo.id);
                          }
                          return next;
                        })
                      }
                    />
                    Select all {visible.length} shown
                  </label>
                  <ul className="unused-photos__grid">
                    {visible.map((photo) => (
                      <UnusedTile
                        key={photo.id}
                        photo={photo}
                        picked={picked.has(photo.id)}
                        disabled={busy}
                        onOpen={() => setEditing(photo.id)}
                        onToggle={() => toggle(photo.id)}
                        onAddToAlbum={() => setAlbumIds([photo.id])}
                        onTrash={() => askToTrash([photo.id])}
                      />
                    ))}
                  </ul>
                  {matching.length > shown && (
                    <div className="unused-photos__more">
                      <Button buttonStyle="secondary" size="medium" margin={false} onClick={() => setShown(shown + PAGE)}>
                        Show {Math.min(PAGE, matching.length - shown)} more &middot; {matching.length - shown} left
                      </Button>
                    </div>
                  )}
                </>
              )}

              {picked.size > 0 && (
                <div className="unused-photos__bar">
                  <span>{picked.size === 1 ? "1 selected" : `${picked.size} selected`}</span>
                  <span className="unused-photos__bar-buttons">
                    <Button buttonStyle="secondary" size="medium" margin={false} disabled={busy} onClick={() => setPicked(new Set())}>
                      Clear
                    </Button>
                    <Button buttonStyle="secondary" size="medium" margin={false} disabled={busy} onClick={() => setAlbumIds(pickedIds)}>
                      Add {picked.size} to album…
                    </Button>
                    <Button buttonStyle="primary" size="medium" margin={false} disabled={busy} onClick={() => askToTrash(pickedIds)}>
                      Move {picked.size} to Trash
                    </Button>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {editing !== null && <EditPhotoDrawer key={editing} id={editing} onSaved={() => void refresh()} onClosed={closeEditor} />}

      {albumIds !== null && (
        <AlbumPicker count={albumIds.length} onPick={(album) => void addToAlbum(album, albumIds)} onClosed={closePicker} />
      )}

      <ConfirmationModal
        modalSlug={MODAL}
        heading={trashIds.length === 1 ? "Move this photo to the Trash?" : `Move ${trashIds.length} photos to the Trash?`}
        body="They're not in any album or used on your site. You can restore them from the Trash tab until you delete them for good."
        confirmLabel="Move to Trash"
        onConfirm={moveToTrash}
        onCancel={() => setTrashIds([])}
      />
    </section>
  );
}

// One unused photo: the photo itself opens its edit form, the ring picks
// it, the ⋯ menu has the rest. Three separate controls, so each has its own
// name for screen readers and keyboard focus.
function UnusedTile({
  photo,
  picked,
  disabled,
  onOpen,
  onToggle,
  onAddToAlbum,
  onTrash,
}: {
  photo: UnusedPhoto;
  picked: boolean;
  disabled: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onAddToAlbum: () => void;
  onTrash: () => void;
}) {
  const name = nameOf(photo);
  return (
    <li className={`unused-photos__tile${picked ? " unused-photos__tile--picked" : ""}`}>
      <button type="button" className="unused-photos__photo" disabled={disabled} title={`Edit ${name}`} onClick={onOpen}>
        <span className="unused-photos__frame">
          {photo.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from the media store
            <img src={photo.thumbnail} alt="" loading="lazy" />
          ) : (
            <span className="unused-photos__no-preview">No preview</span>
          )}
        </span>
        <span className="unused-photos__name">{name}</span>
        <span className="unused-photos__date">{dateOf(photo.createdAt)}</span>
      </button>
      <button
        type="button"
        className="unused-photos__check"
        role="checkbox"
        aria-checked={picked}
        aria-label={`Select ${name}`}
        disabled={disabled}
        onClick={onToggle}
      />
      <Popup
        button={<MoreIcon />}
        buttonClassName="unused-photos__menu-button"
        className="unused-photos__menu"
        horizontalAlign="right"
        size="medium"
        disabled={disabled}
        render={({ close }) => (
          <PopupList.ButtonGroup buttonSize="small">
            <PopupList.Button
              onClick={() => {
                close();
                onOpen();
              }}
            >
              Edit photo details
            </PopupList.Button>
            <PopupList.Button
              onClick={() => {
                close();
                onAddToAlbum();
              }}
            >
              Add to album…
            </PopupList.Button>
            <PopupList.Button
              className="album-photos__danger"
              onClick={() => {
                close();
                onTrash();
              }}
            >
              Move to Trash
            </PopupList.Button>
          </PopupList.ButtonGroup>
        )}
      />
    </li>
  );
}
