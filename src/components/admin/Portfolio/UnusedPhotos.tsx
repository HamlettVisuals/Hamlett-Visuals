"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmationModal, toast, useConfig, useModal } from "@payloadcms/ui";
import type { UnusedPhoto } from "@/lib/photo-usage";

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
// Pick photos, then "Move to Trash": POST /api/photos/trash-unused, which
// checks each one is still unused first (a photo added to an album or used
// since the page loaded is left alone, and she's told). From the Trash tab
// they can be restored or deleted for good. Opens by itself for a
// #unused-photos link (a photo's ✕ when it's in no album). Styles:
// .unused-photos in admin-overrides.css.

const PAGE = 60;
const MODAL = "unused-photos-trash";
export const UNUSED_PHOTOS_ID = "unused-photos";

type Sort = "newest" | "oldest" | "name";

const nameOf = (photo: UnusedPhoto) => photo.alt?.trim() || photo.filename || `Photo ${photo.id}`;
const dateOf = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch(`${apiBase}/photos/unused`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "The unused photos couldn't be loaded.");
        setPhotos(json.photos as UnusedPhoto[]);
        setLoadError(null);
      })
      .catch((err: Error) => setLoadError(err.message));

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

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const moveToTrash = async () => {
    const ids = [...picked];
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
      if (trashed.length) {
        toast.success(`${trashed.length === 1 ? "1 photo" : `${trashed.length} photos`} moved to the Trash.`);
      }
      if (skipped.length) {
        toast.warning(
          `${skipped.length === 1 ? "1 photo was" : `${skipped.length} photos were`} left alone: added to an album or used on the site since this page loaded.`,
        );
      }
      setPicked(new Set());
    } catch (err) {
      toast.error(`Nothing was moved to the Trash: ${err instanceof Error ? err.message : ""}`);
    } finally {
      setBusy(false);
      await load();
      router.refresh();
    }
  };

  const total = photos?.length ?? count;

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
                      <li key={photo.id}>
                        <button
                          type="button"
                          className={`unused-photos__photo${picked.has(photo.id) ? " unused-photos__photo--picked" : ""}`}
                          aria-pressed={picked.has(photo.id)}
                          disabled={busy}
                          onClick={() => toggle(photo.id)}
                        >
                          <span className="unused-photos__frame">
                            {photo.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from the media store
                              <img src={photo.thumbnail} alt="" loading="lazy" />
                            ) : (
                              <span className="unused-photos__no-preview">No preview</span>
                            )}
                            <span className="unused-photos__check" aria-hidden="true" />
                          </span>
                          <span className="unused-photos__name" title={nameOf(photo)}>
                            {nameOf(photo)}
                          </span>
                          <span className="unused-photos__date">{dateOf(photo.createdAt)}</span>
                        </button>
                      </li>
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
                    <Button buttonStyle="primary" size="medium" margin={false} disabled={busy} onClick={() => openModal(MODAL)}>
                      Move {picked.size} to Trash
                    </Button>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmationModal
        modalSlug={MODAL}
        heading={picked.size === 1 ? "Move this photo to the Trash?" : `Move ${picked.size} photos to the Trash?`}
        body="They're not in any album or used on your site. You can restore them from the Trash tab until you delete them for good."
        confirmLabel="Move to Trash"
        onConfirm={moveToTrash}
      />
    </section>
  );
}
