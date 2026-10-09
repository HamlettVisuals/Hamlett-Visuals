"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { usePathname } from "next/navigation";
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
  Button,
  ConfirmationModal,
  MoreIcon,
  Popup,
  PopupList,
  toast,
  useConfig,
  useDocumentEvents,
  useDocumentInfo,
  useForm,
  useFormFields,
  useModal,
} from "@payloadcms/ui";
import { comparePhotos } from "@/lib/manual-order";
import { RASTER_IMAGE_MIME_TYPES } from "@/lib/raster-image-types";
import EditPhotoDrawer from "@/components/admin/EditPhotoDrawer";
import AddExistingPhotos from "./AddExistingPhotos";
import { PHOTO_UPLOADS, useUploads, type UploadItem } from "./useUploads";

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
// save fails the grid reloads what's saved and shows why.
//
// Adding photos: "Upload photos" or dropping files on the panel uploads
// them straight to R2 with a progress bar each (upload.ts, useUploads.ts),
// into this album, at its end, with alt text "Photo from <album title>".
// Reordering waits while uploads run, since the order being saved has to
// match the album's photos. A new album has nothing to add photos to yet,
// so the button reads "Save & upload photos": it saves the album (Payload's
// own Save, so the same checks and messages), and once Payload has moved to
// the saved album's page, the files picked are uploaded there
// (pendingForNewAlbum below). New albums also start Hidden, as the form's
// starting value, so the form isn't marked changed by it and the database
// default is untouched. "Add existing photos" picks photos already in the
// library (AddExistingPhotos.tsx); it waits while uploads run, since both
// add photos at the album's end.
//
// Live Preview: the category page reads the album's photos from the server,
// so after each photo change is saved the preview is asked to refresh. The
// change is reported as a document event (useDocumentEvents), which
// Payload's Live Preview passes to the page as "payload-document-event";
// the site's RefreshRouteOnSave (components/LivePreviewRefresh.tsx) then
// re-renders it with fresh data (router.refresh(); every photo save and
// reorder has already refreshed the site's cache). Changes close together,
// like a batch of uploads, are reported once. Styles: .album-photos in
// admin-overrides.css.

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

// Files picked with "Save & upload photos" on a new album, waiting for the
// album to be saved. Kept outside the component: Payload moves to the saved
// album's page after the first save, which may mount this panel afresh.
// Picked up only by an album that has just been saved (within a minute).
let pendingForNewAlbum: { files: File[]; at: number } | null = null;
const PENDING_MS = 60_000;

// Photo changes within this long of each other refresh the preview once.
const PREVIEW_REFRESH_MS = 800;

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

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
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const closePicker = useCallback(() => setPicking(false), []);
  const [dropping, setDropping] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const { submit, dispatchFields } = useForm();
  const title = useFormFields(([fields]) => fields.title?.value);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { reportUpdate } = useDocumentEvents();
  const previewTimer = useRef<number | undefined>(undefined);
  // The event names the photo that changed (the last one, for a batch):
  // Payload's own listeners read its `doc.id` (a relationship field checks
  // whether the update is to the document it points at).
  const refreshPreview = useCallback(
    (photoId: number) => {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = window.setTimeout(() => {
        reportUpdate({
          entitySlug: "photos",
          id: photoId,
          doc: { id: photoId },
          operation: "update",
          updatedAt: new Date().toISOString(),
        });
      }, PREVIEW_REFRESH_MS);
    },
    [reportUpdate],
  );
  useEffect(() => () => window.clearTimeout(previewTimer.current), []);

  const fetchPhotos = useCallback(async () => {
    const query = new URLSearchParams({
      "where[event][equals]": String(albumId),
      pagination: "false",
      depth: "0",
      "select[alt]": "true",
      "select[filename]": "true",
      // The storage plugin builds `url` and the thumbnail's url from the
      // file name, its folder (prefix) and the size's own file name, so
      // those have to be selected too, or the grid gets full-size files.
      "select[url]": "true",
      "select[prefix]": "true",
      "select[sizes][thumbnail]": "true",
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

  const uploads = useUploads({
    steps: PHOTO_UPLOADS,
    apiBase,
    albumId,
    alt: `Photo from ${typeof title === "string" && title.trim() ? title.trim() : "this album"}`,
    onAdded: async (photoId) => {
      await load();
      refreshPreview(photoId);
    },
  });
  const addUploads = uploads.add;

  // New albums start Hidden: the form's starting value, set once the form
  // has loaded its own (as CategoryPrefill.tsx does).
  useEffect(() => {
    if (id) return;
    const timer = window.setTimeout(() => {
      dispatchFields({ type: "UPDATE", path: "published", value: false, initialValue: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, dispatchFields]);

  // "Save & upload photos": the album is saved, so upload what was picked.
  // Only once Payload has moved to the saved album's page: the panel on the
  // create page learns the new id a moment before it's replaced, and
  // uploads started there would lose their progress tiles.
  const pathname = usePathname();
  const onSavedAlbumPage = albumId != null && Boolean(pathname?.endsWith(`/${albumId}`));
  useEffect(() => {
    if (!onSavedAlbumPage || !pendingForNewAlbum) return;
    const timer = window.setTimeout(() => {
      const pending = pendingForNewAlbum;
      pendingForNewAlbum = null;
      if (pending && Date.now() - pending.at <= PENDING_MS) addUploads(pending.files);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onSavedAlbumPage, addUploads]);

  const saveThenUpload = async (files: File[]) => {
    setError(null);
    setSaving(true);
    pendingForNewAlbum = { files, at: Date.now() };
    const result = await submit().catch(() => undefined);
    if (!result || !result.res.ok) {
      pendingForNewAlbum = null;
      setError("The album wasn't saved, so no photos were uploaded. Fix what's marked above, then try again.");
    }
    setSaving(false);
  };

  const addFiles = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []);
    if (!files.length || saving) return;
    if (albumId == null) void saveThenUpload(files);
    else addUploads(files);
  };

  const dropProps = {
    onDragEnter: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDropping(true);
    },
    onDragOver: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDropping(false);
    },
    onDrop: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDropping(false);
      addFiles(event.dataTransfer.files);
    },
  };

  // Runs one photo change: shows it as busy, reloads the grid afterwards
  // (success or not), and reports a failure above the grid. A change to a
  // photo (`changed`) also refreshes the Live Preview once it's saved.
  const run = async (work: () => Promise<void>, failure: string, changed?: number) => {
    setError(null);
    setBusy(true);
    try {
      await work();
      if (changed !== undefined) refreshPreview(changed);
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
      moved,
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
      // Say where it went: still used somewhere (a cover, a slide…), or now
      // under Unused photos on Categories & Albums.
      const { uses } = (await request(`${apiBase}/photos/${photo.id}/usage`, "GET").catch(() => ({ uses: null }))) as {
        uses: string[] | null;
      };
      toast.success(
        uses?.length
          ? `Removed "${label(photo)}" from this album. It's still used as ${uses.join(", ")}.`
          : `Removed "${label(photo)}" from this album. It's now under Unused photos on Categories & Albums.`,
      );
    }, "The photo wasn't removed:", photo.id);

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
    }, "The photo wasn't deleted:", photo.id);
    setDeleting(null);
  };

  const isNew = albumId == null;
  const lockedReason = uploads.active ? "Wait for the uploads to finish" : undefined;

  return (
    <div
      className={`album-photos field-type${dropping ? " album-photos--dropping" : ""}`}
      aria-busy={busy || saving || (!isNew && photos === null)}
      {...dropProps}
    >
      <PhotosHeading count={isNew ? null : (photos?.length ?? null)} />
      <p className="album-photos__note">
        {isNew ? (
          "Add photos now and the album is saved first, or save it and add them after."
        ) : (
          <>
            Photo changes save as you make them. Drag &#8942;&#8942; to change the order; the first photo is the
            album&apos;s cover.
          </>
        )}
      </p>

      <div className="album-photos__actions">
        <Button buttonStyle="secondary" size="medium" margin={false} disabled={saving} onClick={() => fileInput.current?.click()}>
          {saving ? "Saving the album…" : isNew ? "Save & upload photos" : "Upload photos"}
        </Button>
        {!isNew && (
          <Button
            buttonStyle="secondary"
            size="medium"
            margin={false}
            disabled={uploads.active || busy}
            tooltip={uploads.active ? "Wait for the uploads to finish" : undefined}
            onClick={() => setPicking(true)}
          >
            Add existing photos
          </Button>
        )}
        <input
          ref={fileInput}
          className="album-photos__file-input"
          type="file"
          multiple
          accept={RASTER_IMAGE_MIME_TYPES.join(",")}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <span className="album-photos__drop-hint">{dropping ? "Drop to add them" : "or drop photos here"}</span>
      </div>

      {error && (
        <p className="album-photos__error" role="alert">
          {error}
        </p>
      )}

      {isNew ? null : photos === null ? (
        <p className="album-photos__empty">Loading photos…</p>
      ) : photos.length === 0 && uploads.items.length === 0 ? (
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
                  disabled={busy || uploads.active}
                  lockedReason={lockedReason}
                  onSetCover={() => setAsCover(photo)}
                  onEdit={() => setEditing(photo.id)}
                  onRemove={() => void removeFromAlbum(photo)}
                  onDelete={() => void askToDelete(photo)}
                />
              ))}
              {uploads.items.map((item) => (
                <UploadTile key={item.key} item={item} onDismiss={() => uploads.dismiss(item.key)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {picking && albumId != null && (
        <AddExistingPhotos apiBase={apiBase} albumId={albumId} onAdded={async (ids) => {
            await load();
            if (ids.length) refreshPreview(ids[ids.length - 1]);
          }}
          onClosed={closePicker} />
      )}

      {editing !== null && (
        <EditPhotoDrawer key={editing} id={editing} onSaved={() => {
            void load();
            refreshPreview(editing);
          }} onClosed={() => setEditing(null)} />
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
  lockedReason,
  onSetCover,
  onEdit,
  onRemove,
  onDelete,
}: {
  photo: Photo;
  isCover: boolean;
  disabled: boolean;
  lockedReason?: string;
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
        title={lockedReason ?? `Drag to reorder ${name}`}
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

// A file on its way in: its preview, a progress bar while it goes to R2,
// then "Saving…" (or `savingLabel`) while the server saves it; or why it
// wasn't added. Videos' uploads use it too (AlbumVideos), with their own
// class names (`block`).
export function UploadTile({
  item,
  savingLabel = "Saving…",
  block = "album-photos",
  onDismiss,
}: {
  item: UploadItem;
  savingLabel?: string;
  block?: "album-photos" | "album-videos";
  onDismiss: () => void;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const percent = Math.round(item.progress * 100);
  const status = {
    waiting: "Waiting…",
    uploading: `Uploading ${percent}%`,
    saving: savingLabel,
    error: "Not added",
  }[item.status];

  return (
    <li className={`${block}__tile ${block}__upload${item.status === "error" ? ` ${block}__upload--error` : ""}`}>
      {item.preview && !previewFailed && item.status !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file
        <img className={`${block}__img ${block}__img--pending`} src={item.preview} alt="" onError={() => setPreviewFailed(true)} />
      )}
      <div className={`${block}__upload-info`}>
        <span className={`${block}__upload-name`} title={item.name}>
          {item.name}
        </span>
        <span className={`${block}__upload-status`} aria-live="polite">
          {status}
        </span>
        {item.status === "error" ? (
          <>
            <span className={`${block}__upload-error`}>{item.error}</span>
            <button type="button" className={`${block}__dismiss`} onClick={onDismiss}>
              Dismiss
            </button>
          </>
        ) : (
          <span
            className={`${block}__progress`}
            role="progressbar"
            aria-label={`Uploading ${item.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span className={`${block}__progress-bar`} style={{ width: `${percent}%` }} />
          </span>
        )}
      </div>
    </li>
  );
}
