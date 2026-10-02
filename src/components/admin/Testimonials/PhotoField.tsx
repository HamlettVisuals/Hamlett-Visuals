"use client";

import { useEffect, useState } from "react";
import type { UploadFieldClientComponent } from "payload";
import { UploadField, useConfig, useField, useFormFields } from "@payloadcms/ui";
import { comparePhotos } from "@/lib/manual-order";
import { getJSON, idOf } from "./api";

// The testimonial's photo. Above Payload's own upload input (which keeps
// "Choose from existing" for any photo already uploaded, and "Create New"
// for a new file): the linked album's photos, in her order, to pick with
// one tap, so she doesn't export and upload a copy. For a client's
// testimonial, also the photos they sent (private until picked: picking one
// copies it into Photos, Testimonials' /promote-photo endpoint). Left
// empty, the site uses the album's cover, then the category's.

type PhotoDoc = {
  id: number;
  url?: string | null;
  alt?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
  albumOrder?: string | null;
  createdAt?: string | null;
};

const thumb = (photo: PhotoDoc) => photo.sizes?.thumbnail?.url || photo.url || "";

const PhotoField: UploadFieldClientComponent = (props) => {
  const { path } = props;
  const { config } = useConfig();
  const { value, setValue } = useField<number | null>({ path });
  const eventId = idOf(useFormFields(([fields]) => fields.event?.value));
  const submissionId = idOf(useFormFields(([fields]) => fields.submission?.value));
  // Each list with the album / submission it was loaded for, so a change
  // of album never shows the last one's photos.
  const [album, setAlbum] = useState<{ for: number; photos: PhotoDoc[] } | null>(null);
  const [client, setClient] = useState<{ for: number; photos: PhotoDoc[] } | null>(null);
  const [copying, setCopying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  const current = idOf(value);
  const albumPhotos = eventId != null && album?.for === eventId ? album.photos : [];
  const clientPhotos = submissionId != null && client?.for === submissionId ? client.photos : [];

  useEffect(() => {
    if (eventId == null) return;
    let cancelled = false;
    void getJSON<{ docs: PhotoDoc[] }>(`${apiBase}/photos?where[event][equals]=${eventId}&depth=0&limit=200`).then((result) => {
      if (!cancelled) setAlbum({ for: eventId, photos: (result?.docs ?? []).filter((photo) => thumb(photo)).toSorted(comparePhotos) });
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase, eventId]);

  useEffect(() => {
    if (submissionId == null) return;
    let cancelled = false;
    void getJSON<{ photos?: PhotoDoc[] }>(`${apiBase}/testimonial-submissions/${submissionId}?depth=1`).then((result) => {
      if (!cancelled) setClient({ for: submissionId, photos: (result?.photos ?? []).filter((photo) => typeof photo === "object" && thumb(photo)) });
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase, submissionId]);

  const pickClientPhoto = async (photo: PhotoDoc) => {
    setError(null);
    setCopying(photo.id);
    try {
      const res = await fetch(`${apiBase}/testimonials/promote-photo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission: submissionId, photo: photo.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || typeof body?.id !== "number") throw new Error(body?.error ?? "That photo couldn't be used.");
      setValue(body.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That photo couldn't be used.");
    } finally {
      setCopying(null);
    }
  };

  return (
    <div className="testimonial-photo">
      {albumPhotos.length > 0 && (
        <div className="testimonial-photo__pick">
          <p className="testimonial-photo__heading">From the album</p>
          <ul className="testimonial-photo__grid">
            {albumPhotos.map((photo) => (
              <li key={photo.id}>
                <button
                  type="button"
                  className={`testimonial-photo__option${current === photo.id ? " testimonial-photo__option--on" : ""}`}
                  aria-pressed={current === photo.id}
                  aria-label={photo.alt ? `Use ${photo.alt}` : "Use this photo"}
                  onClick={() => setValue(current === photo.id ? null : photo.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from the media store */}
                  <img src={thumb(photo)} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {clientPhotos.length > 0 && (
        <div className="testimonial-photo__pick">
          <p className="testimonial-photo__heading">Sent by the client (private until you use one)</p>
          <ul className="testimonial-photo__grid">
            {clientPhotos.map((photo) => (
              <li key={photo.id}>
                <button
                  type="button"
                  className="testimonial-photo__option"
                  disabled={copying !== null}
                  aria-label="Use this photo (copies it into your photos)"
                  onClick={() => void pickClientPhoto(photo)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from the media store */}
                  <img src={thumb(photo)} alt="" loading="lazy" />
                  {copying === photo.id && <span className="testimonial-photo__busy">Adding…</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <div className="field-warning" role="alert">
          {error}
        </div>
      )}
      <UploadField {...props} />
    </div>
  );
};

export default PhotoField;
