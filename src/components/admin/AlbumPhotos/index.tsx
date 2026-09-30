"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import {
  ConfirmationModal,
  MoreIcon,
  Popup,
  PopupList,
  toast,
  useConfig,
  useDocumentDrawer,
  useDocumentInfo,
  useModal,
} from "@payloadcms/ui";
import { comparePhotos } from "@/lib/manual-order";

// The album's photos, inside the album's edit form (a `ui` field,
// collections/Events.ts, so Live Preview keeps working): a grid in her
// order, the first one marked Cover (it leads the album everywhere; there's
// no separate cover field).
//
// Reorder by dragging a photo's handle, with the same sensors as
// Categories & Albums (a mouse drag, press-and-hold on touch, or the
// keyboard). Each photo's menu: Set as album cover (moves it first),
// Edit photo details (the photo's own form, in a drawer), Remove from album
// (the photo stays in the library, "Not in an album") and Delete photo…
// (to the Photos Trash, after saying where else the site shows it).
//
// Every change saves straight away, apart from the album's own Save: a
// drag through /api/photos/reorder-photos (order key only, no History
// version, lib/reorder-within.ts), the rest as ordinary photo saves. The
// album's form holds nothing the grid changes, so it isn't touched. If a
// save fails the grid reloads what's saved and shows why. Styles:
// .album-photos in admin-overrides.css.

type Photo = {
  id: number;
  alt?: string | null;
  filename?: string | null;
  url?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
  albumOrder?: string | null;
  createdAt?: string | null;
};

const DELETE_MODAL = "album-photos-delete";

const transformStyle = (transform: { x: number; y: number } | null, transition?: string): CSSProperties => ({
  transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  transition,
});

const label = (photo: Photo) => photo.alt?.trim() || photo.filename || "this photo";

async function request(url: string, method: "GET" | "POST" | "PATCH", body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? json?.errors?.[0]?.message ?? "Something went wrong. Try again.");
  return json;
}

export default function AlbumPhotos() {
  const { id } = useDocumentInfo();
  const { config } = useConfig();
  const { openModal } = useModal();
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  const albumId = typeof id === "number" ? id : id ? Number(id) : null;

  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<{ photo: Photo; uses: string[] } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchPhotos = useCallback(async () => {
    const query = new URLSearchParams({
      "where[event][equals]": String(albumId),
      pagination: "false",
      depth: "0",
      "select[alt]": "true",
      "select[filename]": "true",
      "select[url]": "true",
      "select[sizes][thumbnail][url]": "true",
      "select[albumOrder]": "true",
      "select[createdAt]": "true",
    });
    const json = (await request(`${apiBase}/photos?${query}`, "GET")) as { docs: Photo[] };
    return json.docs.toSorted(comparePhotos);
  }, [albumId, apiBase]);

  // Answers can come back out of order after quick changes; only the last
  // load counts.
  const loadCount = useRef(0);
  const load = useCallback(() => {
    const count = ++loadCount.current;
    return fetchPhotos().then(
      (docs) => {
        if (count === loadCount.current) setPhotos(docs);
      },
      (err: unknown) => {
        if (count === loadCount.current) setError(err instanceof Error ? err.message : "The photos couldn't be loaded.");
      },
    );
  }, [fetchPhotos]);

  useEffect(() => {
    if (albumId != null) void load();
  }, [albumId, load]);

  // Runs one photo change: shows it as busy, reloads the grid afterwards
  // (success or not), and reports a failure above the grid.
  const run = async (work: () => Promise<void>, failure: string) => {
    setError(null);
    setBusy(true);
    try {
      await work();
    } catch (err) {
      setError(`${failure} ${err instanceof Error ? err.message : ""}`.trim());
    } finally {
      await load();
      setBusy(false);
    }
  };

  const saveOrder = (next: Photo[], moved: number) => {
    setPhotos(next);
    void run(
      () =>
        request(`${apiBase}/photos/reorder-photos`, "POST", {
          album: albumId,
          order: next.map((photo) => photo.id),
          moved,
        }),
      "The new order wasn't saved:",
    );
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!photos || !over || active.id === over.id) return;
    const from = photos.findIndex((photo) => photo.id === active.id);
    const to = photos.findIndex((photo) => photo.id === over.id);
    if (from >= 0 && to >= 0) saveOrder(arrayMove(photos, from, to), Number(active.id));
  };

  const setAsCover = (photo: Photo) => {
    if (!photos) return;
    const from = photos.findIndex((p) => p.id === photo.id);
    if (from > 0) saveOrder(arrayMove(photos, from, 0), photo.id);
  };

  const removeFromAlbum = (photo: Photo) =>
    run(async () => {
      await request(`${apiBase}/photos/${photo.id}`, "PATCH", { event: null });
      toast.success(`Removed "${label(photo)}" from this album. It's still in your photos, under "Not in an album".`);
    }, "The photo wasn't removed:");

  const askToDelete = (photo: Photo) =>
    run(async () => {
      const { uses } = (await request(`${apiBase}/photos/${photo.id}/usage`, "GET")) as { uses: string[] };
      setDeleting({ photo, uses });
      openModal(DELETE_MODAL);
    }, "Couldn't check where this photo is used:");

  const deletePhoto = async () => {
    if (!deleting) return;
    const { photo } = deleting;
    await run(async () => {
      await request(`${apiBase}/photos/${photo.id}`, "PATCH", { deletedAt: new Date().toISOString() });
      toast.success(`"${label(photo)}" moved to the Photos Trash.`);
    }, "The photo wasn't deleted:");
    setDeleting(null);
  };

  if (albumId == null) {
    return (
      <div className="album-photos field-type">
        <PhotosHeading count={null} />
        <p className="album-photos__empty">Save the album first, then add its photos here.</p>
      </div>
    );
  }

  return (
    <div className="album-photos field-type" aria-busy={busy || photos === null}>
      <PhotosHeading count={photos?.length ?? null} />
      <p className="album-photos__note">
        Photo changes save as you make them. Drag &#8942;&#8942; to change the order; the first photo is the album&apos;s
        cover.
      </p>

      {error && (
        <p className="album-photos__error" role="alert">
          {error}
        </p>
      )}

      {photos === null ? (
        <p className="album-photos__empty">Loading photos…</p>
      ) : photos.length === 0 ? (
        <p className="album-photos__empty">No photos in this album yet.</p>
      ) : (
        <DndContext id={`album-photos-${albumId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={photos.map((photo) => photo.id)} strategy={rectSortingStrategy}>
            <ul className="album-photos__grid">
              {photos.map((photo, index) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  isCover={index === 0}
                  disabled={busy}
                  onSetCover={() => setAsCover(photo)}
                  onEdit={() => setEditing(photo.id)}
                  onRemove={() => void removeFromAlbum(photo)}
                  onDelete={() => void askToDelete(photo)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {editing !== null && (
        <EditPhotoDrawer key={editing} id={editing} onSaved={() => void load()} onClosed={() => setEditing(null)} />
      )}

      <ConfirmationModal
        modalSlug={DELETE_MODAL}
        heading={deleting ? `Delete "${label(deleting.photo)}"?` : "Delete this photo?"}
        body={
          deleting?.uses.length ? (
            <>
              <p>It goes to the Photos Trash, where you can restore it. It&apos;s also used as:</p>
              <ul className="album-photos__uses">
                {deleting.uses.map((use) => (
                  <li key={use}>{use}</li>
                ))}
              </ul>
              <p>Those places will show without it until you pick another photo.</p>
            </>
          ) : (
            "It goes to the Photos Trash, where you can restore it."
          )
        }
        confirmLabel="Delete photo"
        onConfirm={deletePhoto}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function PhotosHeading({ count }: { count: number | null }) {
  return (
    <div className="album-photos__head">
      <span className="album-photos__title">Photos</span>
      {count !== null && <span className="album-photos__count">{count}</span>}
    </div>
  );
}

function PhotoTile({
  photo,
  isCover,
  disabled,
  onSetCover,
  onEdit,
  onRemove,
  onDelete,
}: {
  photo: Photo;
  isCover: boolean;
  disabled: boolean;
  onSetCover: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
    disabled,
  });
  const src = photo.sizes?.thumbnail?.url || photo.url;
  const name = label(photo);

  return (
    <li
      ref={setNodeRef}
      style={transformStyle(transform, transition)}
      className={`album-photos__tile${isDragging ? " album-photos__tile--dragging" : ""}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from the media store
        <img className="album-photos__img" src={src} alt={photo.alt ?? ""} loading="lazy" draggable={false} />
      ) : (
        <span className="album-photos__img album-photos__img--missing">No preview</span>
      )}
      {isCover && <span className="album-photos__cover">Cover</span>}
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="album-photos__handle"
        aria-label={`Drag to reorder ${name}`}
        title={`Drag to reorder ${name}`}
        disabled={disabled}
        {...attributes}
        {...(disabled ? {} : listeners)}
      />
      <Popup
        button={<MoreIcon />}
        buttonClassName="album-photos__menu-button"
        className="album-photos__menu"
        horizontalAlign="right"
        size="medium"
        disabled={disabled}
        render={({ close }) => (
          <PopupList.ButtonGroup buttonSize="small">
            {!isCover && (
              <PopupList.Button
                onClick={() => {
                  close();
                  onSetCover();
                }}
              >
                Set as album cover
              </PopupList.Button>
            )}
            <PopupList.Button
              onClick={() => {
                close();
                onEdit();
              }}
            >
              Edit photo details
            </PopupList.Button>
            <PopupList.Button
              onClick={() => {
                close();
                onRemove();
              }}
            >
              Remove from album
            </PopupList.Button>
            <PopupList.Button
              className="album-photos__danger"
              onClick={() => {
                close();
                onDelete();
              }}
            >
              Delete photo…
            </PopupList.Button>
          </PopupList.ButtonGroup>
        )}
      />
    </li>
  );
}

// The photo's own edit form (alt text, caption, crop and focal point), in a
// drawer over the album. Opens as it mounts; the grid unmounts it once it's
// closed.
function EditPhotoDrawer({ id, onSaved, onClosed }: { id: number; onSaved: () => void; onClosed: () => void }) {
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
