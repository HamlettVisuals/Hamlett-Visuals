"use client";

import { useEffect, useState } from "react";
import { useConfig, useRowLabel } from "@payloadcms/ui";

// The Hero's "Hero slides" rows (globals/Hero.ts) start collapsed, so each
// row's header says which slide it is: the main image's thumbnail and its
// name (the photo's alt text, else its file name), and whether it has a
// mobile image. Payload's own label would just be "Slide 01".

type Id = number | string;
type PhotoInfo = { name: string; src: string | null };
type SlideData = { photo?: unknown; mobilePhoto?: unknown };

const idOf = (value: unknown): Id | null => {
  const id = value && typeof value === "object" ? (value as { id?: unknown }).id : value;
  return typeof id === "number" || typeof id === "string" ? id : null;
};

// One request per photo while the page is open, shared by every row.
const requests = new Map<string, Promise<PhotoInfo | null>>();

function usePhotoInfo(id: Id | null): PhotoInfo | null | undefined {
  const { config } = useConfig();
  const [info, setInfo] = useState<{ id: Id; value: PhotoInfo | null } | null>(null);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    if (id == null) return;
    let cancelled = false;
    const key = `${apiBase}|${id}`;
    if (!requests.has(key)) {
      const params = new URLSearchParams({
        depth: "0",
        "select[alt]": "true",
        "select[filename]": "true",
        "select[url]": "true",
        "select[sizes]": "true",
        // Part of the file URLs (the storage folder).
        "select[prefix]": "true",
      });
      requests.set(
        key,
        fetch(`${apiBase}/photos/${id}?${params}`, { credentials: "include" })
          .then((res) => (res.ok ? res.json() : null))
          .then((doc) =>
            doc
              ? {
                  name: doc.alt?.trim() || doc.filename || "Untitled photo",
                  src: doc.sizes?.thumbnail?.url || doc.url || null,
                }
              : null,
          )
          .catch(() => null),
      );
    }
    requests.get(key)!.then((value) => {
      if (!cancelled) setInfo({ id, value });
    });
    return () => {
      cancelled = true;
    };
  }, [id, apiBase]);

  if (id == null) return null;
  return info?.id === id ? info.value : undefined;
}

export default function HeroSlideRowLabel() {
  const { data, rowNumber } = useRowLabel<SlideData>();
  const photoId = idOf(data?.photo);
  const photo = usePhotoInfo(photoId);
  const hasMobile = idOf(data?.mobilePhoto) != null;
  const number = String((rowNumber ?? 0) + 1).padStart(2, "0");

  let name: string;
  if (photoId == null) name = "No image yet";
  else if (photo === undefined) name = "Loading…";
  else name = photo?.name ?? "Image not found";

  return (
    <span className="hero-slide-label">
      {photo?.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
        <img className="hero-slide-label__thumb" src={photo.src} alt="" />
      ) : (
        <span className="hero-slide-label__thumb hero-slide-label__thumb--empty" aria-hidden="true" />
      )}
      <span className="hero-slide-label__text">
        <span className="hero-slide-label__number">Slide {number}</span>
        <span className="hero-slide-label__name">{name}</span>
        {hasMobile && <span className="hero-slide-label__mobile">+ mobile image</span>}
      </span>
    </span>
  );
}
