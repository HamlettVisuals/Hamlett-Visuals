"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
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
  useModal,
} from "@payloadcms/ui";
import { EXPORT_ADVICE, SLOW_START_ADVICE, formatDuration } from "@/lib/album-video-limits";
import { comparePhotos } from "@/lib/manual-order";
import { UploadTile } from "@/components/admin/AlbumPhotos";
import { useUploads, VIDEO_UPLOADS } from "@/components/admin/AlbumPhotos/useUploads";
import PosterPicker from "./PosterPicker";
import { videoLabel, type AlbumVideo, type Poster } from "./video";

// The album's videos, inside the album's edit form (a `ui` field,
// collections/Events.ts), above its photos, the way the site shows them:
// walkthroughs and highlight reels, each a large player at the top of the
// album's section on its category page.
//
// Built like the photo grid below it (components/admin/AlbumPhotos): every
// change saves straight away, apart from the album's own Save; reorder by
// dragging a video's handle (/api/videos/reorder-videos, order key only);
// uploads go straight to R2 with a progress bar (the same queue as photos,
// useUploads.ts), then the server checks the file where it is (Videos.ts):
// an H.264 MP4 up to 1GB and 10 minutes, or it's refused with how to
// export it. A video it accepts gets a poster made from one of its frames.
//
// Each video's menu: Edit title, Choose poster (one of the album's photos,
// or one uploaded for it, PosterPicker.tsx), Use the automatic poster (when
// she's chosen one), Delete video… (to the Videos Trash). A video that
// isn't set up for fast start says so under its tile.
//
// Live Preview: each saved change is reported as a document event, which
// refreshes the preview (see AlbumPhotos for how). Styles: .album-videos in
// admin-overrides.css, which shares the .album-photos rules.

const DELETE_MODAL = "album-videos-delete";
const PREVIEW_REFRESH_MS = 800;

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

const transformStyle = (transform: { x: number; y: number } | null, transition?: string): CSSProperties => ({
  transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  transition,
});

const populated = (value: Poster | number | null | undefined): Poster | null =>
  value && typeof value === "object" ? value : null;

/** The image her tile shows: her poster, else the automatic one. */
function posterSrc(video: AlbumVideo): string | null {
  const chosen = populated(video.poster);
  if (chosen) return chosen.sizes?.thumbnail?.url || chosen.url || null;
  const auto = populated(video.autoPoster);
  return auto?.sizes?.thumbnail?.url || auto?.url || null;
}

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

export default function AlbumVideos() {
  const { id } = useDocumentInfo();
  const { config } = useConfig();
  const { openModal } = useModal();
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  const adminBase = `${config.serverURL ?? ""}${config.routes.admin}`;
  const albumId = typeof id === "number" ? id : id ? Number(id) : null;

  const [videos, setVideos] = useState<AlbumVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [choosingPoster, setChoosingPoster] = useState<AlbumVideo | null>(null);
  const closePicker = useCallback(() => setChoosingPoster(null), []);
  const [deleting, setDeleting] = useState<AlbumVideo | null>(null);
  const [dropping, setDropping] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { reportUpdate } = useDocumentEvents();
  const previewTimer = useRef<number | undefined>(undefined);
  const refreshPreview = useCallback(
    (videoId: number) => {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = window.setTimeout(() => {
        reportUpdate({
          entitySlug: "videos",
          id: videoId,
          doc: { id: videoId },
          operation: "update",
          updatedAt: new Date().toISOString(),
        });
      }, PREVIEW_REFRESH_MS);
    },
    [reportUpdate],
  );
  useEffect(() => () => window.clearTimeout(previewTimer.current), []);

  const fetchVideos = useCallback(async () => {
    const query = new URLSearchParams({
      "where[event][equals]": String(albumId),
      pagination: "false",
      // Posters come with the video (their url and thumbnail).
      depth: "1",
      "select[title]": "true",
      "select[filename]": "true",
      "select[duration]": "true",
      "select[fastStart]": "true",
      "select[poster]": "true",
      "select[autoPoster]": "true",
      "select[albumOrder]": "true",
      "select[createdAt]": "true",
    });
    const json = (await request(`${apiBase}/videos?${query}`, "GET")) as { docs: AlbumVideo[] };
    return json.docs.toSorted(comparePhotos);
  }, [albumId, apiBase]);

  // Only the last load counts (answers can come back out of order).
  const loadCount = useRef(0);
  const load = useCallback(() => {
    const count = ++loadCount.current;
    return fetchVideos().then(
      (docs) => {
        if (count === loadCount.current) setVideos(docs);
      },
      (err: unknown) => {
        if (count === loadCount.current) setError(err instanceof Error ? err.message : "The videos couldn't be loaded.");
      },
    );
  }, [fetchVideos]);

  useEffect(() => {
    if (albumId != null) void load();
  }, [albumId, load]);

  const uploads = useUploads({
    steps: VIDEO_UPLOADS,
    apiBase,
    albumId,
    alt: "",
    onAdded: async (videoId) => {
      await load();
      refreshPreview(videoId);
    },
  });

  const addFiles = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []);
    if (files.length && albumId != null) uploads.add(files);
  };

  const dropProps =
    albumId == null
      ? {}
      : {
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

  // One change: busy while it runs, the list reloaded afterwards (success or
  // not), a failure shown above the list, the preview refreshed on success.
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

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!videos || !over || active.id === over.id) return;
    const from = videos.findIndex((video) => video.id === active.id);
    const to = videos.findIndex((video) => video.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(videos, from, to);
    const moved = Number(active.id);
    setVideos(next);
    void run(
      () => request(`${apiBase}/videos/reorder-videos`, "POST", { album: albumId, order: next.map((v) => v.id), moved }),
      "The new order wasn't saved:",
      moved,
    );
  };

  const saveTitle = (video: AlbumVideo, title: string) => {
    setRenaming(null);
    if (title.trim() === (video.title ?? "").trim()) return;
    void run(
      () => request(`${apiBase}/videos/${video.id}`, "PATCH", { title: title.trim() || null }),
      "The title wasn't saved:",
      video.id,
    );
  };

  const setPoster = (video: AlbumVideo, photoId: number | null) =>
    run(
      () => request(`${apiBase}/videos/${video.id}`, "PATCH", { poster: photoId }),
      "The poster wasn't saved:",
      video.id,
    );

  const deleteVideo = async () => {
    if (!deleting) return;
    const video = deleting;
    await run(async () => {
      await request(`${apiBase}/videos/${video.id}`, "PATCH", { deletedAt: new Date().toISOString() });
      toast.success(`"${videoLabel(video)}" moved to the Videos Trash.`);
    }, "The video wasn't deleted:", video.id);
    setDeleting(null);
  };

  const isNew = albumId == null;
  const locked = busy || uploads.active;

  return (
    <div
      className={`album-videos field-type${dropping ? " album-videos--dropping" : ""}`}
      aria-busy={busy || (!isNew && videos === null)}
      {...dropProps}
    >
      <div className="album-videos__head">
        <span className="album-videos__title">Videos</span>
        {!isNew && videos && <span className="album-videos__count">{videos.length}</span>}
      </div>
      <p className="album-videos__note">
        {isNew ? (
          "Save the album first, then add its videos here. They show above its photos, in this order."
        ) : (
          <>
            Shown above the album&apos;s photos, in this order; drag &#8942;&#8942; to change it. {EXPORT_ADVICE}
          </>
        )}
      </p>

      {!isNew && (
        <div className="album-videos__actions">
          <Button buttonStyle="secondary" size="medium" margin={false} onClick={() => fileInput.current?.click()}>
            Upload video
          </Button>
          <input
            ref={fileInput}
            className="album-videos__file-input"
            type="file"
            multiple
            accept="video/mp4,.mp4"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <span className="album-videos__drop-hint">{dropping ? "Drop to add it" : "or drop an MP4 here"}</span>
        </div>
      )}

      {error && (
        <p className="album-videos__error" role="alert">
          {error}
        </p>
      )}

      {isNew ? null : videos === null ? (
        <p className="album-videos__empty">Loading videos…</p>
      ) : videos.length === 0 && uploads.items.length === 0 ? (
        <p className="album-videos__empty">No videos in this album.</p>
      ) : (
        <DndContext id={`album-videos-${albumId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={videos.map((video) => video.id)} strategy={rectSortingStrategy}>
            <ul className="album-videos__grid">
              {videos.map((video) => (
                <VideoTile
                  key={video.id}
                  video={video}
                  disabled={locked}
                  lockedReason={uploads.active ? "Wait for the upload to finish" : undefined}
                  renaming={renaming === video.id}
                  onRename={() => setRenaming(video.id)}
                  onRenamed={(title) => saveTitle(video, title)}
                  onCancelRename={() => setRenaming(null)}
                  onChoosePoster={() => setChoosingPoster(video)}
                  onUseAutoPoster={() => void setPoster(video, null)}
                  onDelete={() => {
                    setDeleting(video);
                    openModal(DELETE_MODAL);
                  }}
                />
              ))}
              {uploads.items.map((item) => (
                <UploadTile
                  key={item.key}
                  item={item}
                  block="album-videos"
                  savingLabel="Checking the video…"
                  onDismiss={() => uploads.dismiss(item.key)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {!isNew && (
        <p className="album-videos__trash-link">
          <a href={`${adminBase}/collections/videos/trash`}>Deleted videos</a>
        </p>
      )}

      {choosingPoster && albumId != null && (
        <PosterPicker
          apiBase={apiBase}
          albumId={albumId}
          video={choosingPoster}
          onChosen={(photoId) => setPoster(choosingPoster, photoId)}
          onClosed={closePicker}
        />
      )}

      <ConfirmationModal
        modalSlug={DELETE_MODAL}
        heading={deleting ? `Delete "${videoLabel(deleting)}"?` : "Delete this video?"}
        body="It goes to the Videos Trash, where you can restore it."
        confirmLabel="Delete video"
        onConfirm={deleteVideo}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function VideoTile({
  video,
  disabled,
  lockedReason,
  renaming,
  onRename,
  onRenamed,
  onCancelRename,
  onChoosePoster,
  onUseAutoPoster,
  onDelete,
}: {
  video: AlbumVideo;
  disabled: boolean;
  lockedReason?: string;
  renaming: boolean;
  onRename: () => void;
  onRenamed: (title: string) => void;
  onCancelRename: () => void;
  onChoosePoster: () => void;
  onUseAutoPoster: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
    disabled,
  });
  const src = posterSrc(video);
  const name = videoLabel(video);
  const hasOwnPoster = Boolean(video.poster);

  return (
    <li
      ref={setNodeRef}
      style={transformStyle(transform, transition)}
      className={`album-videos__tile${isDragging ? " album-videos__tile--dragging" : ""}`}
    >
      <div className="album-videos__frame">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from the media store
          <img className="album-videos__img" src={src} alt="" loading="lazy" draggable={false} />
        ) : (
          <span className="album-videos__img album-videos__img--missing">No poster</span>
        )}
        <span className="album-videos__play" aria-hidden="true" />
        {video.duration ? <span className="album-videos__duration">{formatDuration(video.duration)}</span> : null}
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="album-videos__handle"
          aria-label={`Drag to reorder ${name}`}
          title={lockedReason ?? `Drag to reorder ${name}`}
          disabled={disabled}
          {...attributes}
          {...(disabled ? {} : listeners)}
        />
        <Popup
          button={<MoreIcon />}
          buttonClassName="album-videos__menu-button"
          className="album-videos__menu"
          horizontalAlign="right"
          size="medium"
          disabled={disabled}
          render={({ close }) => (
            <PopupList.ButtonGroup buttonSize="small">
              <PopupList.Button
                onClick={() => {
                  close();
                  onRename();
                }}
              >
                Edit title
              </PopupList.Button>
              <PopupList.Button
                onClick={() => {
                  close();
                  onChoosePoster();
                }}
              >
                Choose poster…
              </PopupList.Button>
              {hasOwnPoster && (
                <PopupList.Button
                  onClick={() => {
                    close();
                    onUseAutoPoster();
                  }}
                >
                  Use the automatic poster
                </PopupList.Button>
              )}
              <PopupList.Button
                className="album-videos__danger"
                onClick={() => {
                  close();
                  onDelete();
                }}
              >
                Delete video…
              </PopupList.Button>
            </PopupList.ButtonGroup>
          )}
        />
      </div>
      {renaming ? (
        <TitleInput initial={video.title ?? ""} onSave={onRenamed} onCancel={onCancelRename} />
      ) : (
        <button type="button" className="album-videos__name" onClick={onRename} disabled={disabled} title="Edit title">
          {video.title?.trim() || <span className="album-videos__untitled">No title</span>}
        </button>
      )}
      {video.fastStart === false && <p className="album-videos__warning">{SLOW_START_ADVICE}</p>}
    </li>
  );
}

// Enter or leaving the box saves; Escape puts it back.
function TitleInput({ initial, onSave, onCancel }: { initial: string; onSave: (title: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save) onSave(value);
    else onCancel();
  };
  return (
    <input
      className="album-videos__name-input"
      aria-label="Video title"
      placeholder="Title (optional)"
      maxLength={80}
      autoFocus
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      }}
    />
  );
}
