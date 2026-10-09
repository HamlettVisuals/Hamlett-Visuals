"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Drawer, useModal } from "@payloadcms/ui";
import { comparePhotos } from "@/lib/manual-order";
import { RASTER_IMAGE_MIME_TYPES } from "@/lib/raster-image-types";
import { checkPhotoFile, createAlbumPhoto, putInStorage } from "@/components/admin/AlbumPhotos/upload";
import { videoLabel, type AlbumVideo } from "./video";

// "Choose poster…" on an album video (AlbumVideos): a drawer with the
// album's photos, in her order, to pick the one shown before the video
// plays, or "Upload a poster" for an image that isn't in the album. An
// uploaded poster becomes a photo in no album, used by the video, so it
// doesn't join the album's photos but stays in the library (and isn't
// counted as unused, lib/photo-usage.ts). Picking saves straight away and
// closes the drawer. Mounted by AlbumVideos while it's open, like
// AddExistingPhotos. Styles: .add-photos and .poster-picker in
// admin-overrides.css.

export const POSTER_PICKER_DRAWER = "album-video-poster";

type AlbumPhoto = {
  id: number;
  alt?: string | null;
  filename?: string | null;
  url?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
  albumOrder?: string | null;
  createdAt?: string | null;
};

const photoLabel = (photo: AlbumPhoto) => photo.alt?.trim() || photo.filename || "Photo";

export default function PosterPicker({
  apiBase,
  albumId,
  video,
  onChosen,
  onClosed,
}: {
  apiBase: string;
  albumId: number;
  video: AlbumVideo;
  /** Saves the choice (AlbumVideos reports failures and reloads). */
  onChosen: (photoId: number) => Promise<void>;
  onClosed: () => void;
}) {
  const { closeModal, isModalOpen, openModal } = useModal();
  const [photos, setPhotos] = useState<AlbumPhoto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const current = typeof video.poster === "object" && video.poster ? video.poster.id : video.poster;

  useEffect(() => {
    openModal(POSTER_PICKER_DRAWER);
    const query = new URLSearchParams({
      "where[event][equals]": String(albumId),
      pagination: "false",
      depth: "0",
      "select[alt]": "true",
      "select[filename]": "true",
      "select[prefix]": "true",
      "select[url]": "true",
      "select[sizes][thumbnail]": "true",
      "select[albumOrder]": "true",
      "select[createdAt]": "true",
    });
    fetch(`${apiBase}/photos?${query}`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.errors?.[0]?.message ?? "The album's photos couldn't be loaded.");
        setPhotos((json.docs as AlbumPhoto[]).toSorted(comparePhotos));
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "The album's photos couldn't be loaded."));
  }, [albumId, apiBase, openModal]);

  const isOpen = isModalOpen(POSTER_PICKER_DRAWER);
  const opened = useRef(false);
  useEffect(() => {
    if (isOpen) opened.current = true;
    else if (opened.current) onClosed();
  }, [isOpen, onClosed]);

  const choose = async (photoId: number) => {
    closeModal(POSTER_PICKER_DRAWER);
    await onChosen(photoId);
  };

  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    setError(null);
    const checked = checkPhotoFile(picked);
    if ("error" in checked) {
      setError(checked.error);
      return;
    }
    try {
      setUploading(0);
      const stored = await putInStorage("photos", checked.file, apiBase, setUploading);
      const photo = await createAlbumPhoto(checked.file, stored, {
        apiBase,
        albumId: null,
        alt: `Poster for ${videoLabel(video)}`,
      });
      await choose(photo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The poster couldn't be uploaded.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <Drawer slug={POSTER_PICKER_DRAWER} className="add-photos poster-picker" title={`Poster for "${videoLabel(video)}"`}>
      <p className="add-photos__intro">
        Pick the photo shown before the video plays: one from this album, or upload one. Until you choose, a frame from
        the video is shown.
      </p>
      {loadError ? (
        <p className="album-photos__error" role="alert">
          {loadError}
        </p>
      ) : !photos ? (
        <p className="add-photos__loading">Loading the album&apos;s photos…</p>
      ) : photos.length === 0 ? (
        <p className="add-photos__loading">This album has no photos yet. Upload a poster instead.</p>
      ) : (
        <ul className="add-photos__grid poster-picker__grid">
          {photos.map((photo) => {
            const src = photo.sizes?.thumbnail?.url || photo.url;
            const isCurrent = photo.id === current;
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  className={`add-photos__photo${isCurrent ? " add-photos__photo--picked" : ""}`}
                  aria-pressed={isCurrent}
                  disabled={uploading !== null}
                  title={photoLabel(photo)}
                  onClick={() => void choose(photo.id)}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from the media store
                    <img src={src} alt={photoLabel(photo)} loading="lazy" />
                  ) : (
                    <span className="add-photos__no-preview">{photoLabel(photo)}</span>
                  )}
                  {isCurrent && <span className="add-photos__badge">Current poster</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="add-photos__footer">
        {error && (
          <p className="album-photos__error add-photos__error" role="alert">
            {error}
          </p>
        )}
        <div className="add-photos__summary" aria-live="polite">
          {uploading !== null ? `Uploading the poster ${Math.round(uploading * 100)}%…` : ""}
        </div>
        <div className="add-photos__buttons">
          <Button
            buttonStyle="secondary"
            size="medium"
            margin={false}
            disabled={uploading !== null}
            onClick={() => closeModal(POSTER_PICKER_DRAWER)}
          >
            Cancel
          </Button>
          <Button
            buttonStyle="primary"
            size="medium"
            margin={false}
            disabled={uploading !== null}
            onClick={() => fileInput.current?.click()}
          >
            Upload a poster
          </Button>
          <input
            ref={fileInput}
            className="album-photos__file-input"
            type="file"
            accept={RASTER_IMAGE_MIME_TYPES.join(",")}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>
    </Drawer>
  );
}
