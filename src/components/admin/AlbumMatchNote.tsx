"use client";

import { useEffect, useState } from "react";
import { useConfig, useFormFields } from "@payloadcms/ui";
import { useCategories } from "@/components/admin/AlbumCells";

// Under a package's "Sample photos from album" (collections/PricingRows.ts).
// The dropdown only offers live albums in the package's category, but an
// album picked earlier stays picked when the category changes, or when the
// album is later hidden or trashed. Rather than keep a mismatched album
// silently, this says so right away; saving is refused with the same
// wording (validateAlbum in PricingRows.ts) until it's changed or cleared.

type AlbumInfo = {
  id: number;
  title: string;
  category?: number | { id: number } | null;
  published?: boolean | null;
  deletedAt?: string | null;
};

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id?: number | string }).id : value;

export default function AlbumMatchNote({ path }: { path: string }) {
  const { config } = useConfig();
  const categories = useCategories();
  const albumId = useFormFields(([fields]) => idOf(fields[path]?.value));
  const categoryId = useFormFields(([fields]) => idOf(fields.category?.value));
  // Tagged with the id it was fetched for, so a stale answer is ignored.
  const [fetched, setFetched] = useState<{ id: unknown; doc: AlbumInfo | "missing" } | null>(null);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    if (!albumId) return;
    let cancelled = false;
    const params = new URLSearchParams({
      depth: "0",
      trash: "true",
      "select[title]": "true",
      "select[category]": "true",
      "select[published]": "true",
      "select[deletedAt]": "true",
    });
    fetch(`${apiBase}/events/${albumId}?${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : "missing"))
      .then((doc: AlbumInfo | "missing") => {
        if (!cancelled) setFetched({ id: albumId, doc });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [albumId, apiBase]);

  const album = fetched && fetched.id === albumId ? fetched.doc : null;
  if (!albumId || album === null) return null;

  let message: string | null = null;
  if (album === "missing" || album.deletedAt) {
    message = "This album has been deleted. Pick another album, or clear this.";
  } else if (categoryId && String(idOf(album.category)) !== String(categoryId)) {
    const albumCategory = categories.find((c) => String(c.id) === String(idOf(album.category)))?.name;
    const packageCategory = categories.find((c) => String(c.id) === String(categoryId))?.name;
    message = `"${album.title}" is in ${albumCategory ?? "another category"}, not ${packageCategory ?? "this package's category"}. Pick an album from ${packageCategory ?? "this category"}, or clear this.`;
  } else if (!album.published) {
    message = `"${album.title}" is hidden from your site, so its photos won't show. Pick a live album, or clear this.`;
  }

  return message ? (
    <p className="album-match-note" role="alert">
      {message}
    </p>
  ) : null;
}
