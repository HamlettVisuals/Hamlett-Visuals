"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useConfig, useDocumentInfo, useDocumentTitle, useStepNav } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { CloseLink } from "@/components/admin/CloseEditorButton";

// The way back from a photo's own edit page. Photos have no list page any
// more (src/proxy.ts sends it to Categories & Albums), so both the ✕ and
// the breadcrumbs go where the photo lives:
//   - in an album: that album's page (Categories & Albums › <album> › photo);
//   - otherwise: Categories & Albums, opened at Unused photos
//     (Categories & Albums › Unused photos › photo).
// The album is the one saved on the photo, read again after each save, so
// it follows a save that moves the photo to another album. Until it's known
// (a moment after the page opens) the way back is Unused photos.
//
// The breadcrumbs: Payload's own (SetDocumentStepNav) always start with the
// collection's list, so PhotoStepNav puts these in their place, again after
// Payload sets its own (it does so whenever the title changes). Only on the
// photo's own page: in the album page's "Edit photo details" drawer the
// breadcrumbs are the album page's. Mounted from Photos'
// beforeDocumentControls (it renders nothing there); PhotoCloseButton is the
// edit view's ✕ (views.edit.*.actions).

function usePhotoHome() {
  const { config } = useConfig();
  const { data } = useDocumentInfo();
  const pathname = usePathname() ?? "";
  const adminRoute = config.routes.admin;
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  // The ✕ sits in Payload's top bar, outside the document's own context, so
  // the photo is read by the id in the URL; its album comes populated
  // (depth 1) with its title. Read again when the document is saved (the
  // breadcrumbs see its new data), so a move to another album is followed.
  const photoId = pathname.match(/\/collections\/photos\/(\d+)/)?.[1] ?? null;
  const savedAt = (data?.updatedAt as string | undefined) ?? null;
  const [album, setAlbum] = useState<{ photoId: string; id: number | null; title: string | null } | null>(null);

  useEffect(() => {
    if (!photoId) return;
    let live = true;
    fetch(`${apiBase}/photos/${photoId}?depth=1&select[event]=true`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc) => {
        if (!live || !doc) return;
        const event = doc.event as { id: number; title?: string } | number | null | undefined;
        setAlbum({
          photoId,
          id: event && typeof event === "object" ? event.id : (event ?? null),
          title: event && typeof event === "object" ? (event.title ?? null) : null,
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [photoId, savedAt, apiBase]);

  const albumId = album?.photoId === photoId ? album.id : null;
  const albumTitle = album?.photoId === photoId ? album.title : null;
  const portfolio = formatAdminURL({ adminRoute, path: "/portfolio" });
  if (albumId != null) {
    return {
      href: formatAdminURL({ adminRoute, path: `/collections/events/${albumId}` }),
      label: albumTitle ? `Back to ${albumTitle}` : "Back to its album",
      crumbs: [
        { label: "Categories & Albums", url: portfolio },
        { label: albumTitle ?? "Album", url: formatAdminURL({ adminRoute, path: `/collections/events/${albumId}` }) },
      ],
    };
  }
  return {
    href: `${portfolio}#unused-photos`,
    label: "Back to Categories & Albums",
    crumbs: [
      { label: "Categories & Albums", url: portfolio },
      { label: "Unused photos", url: `${portfolio}#unused-photos` },
    ],
  };
}

const onPhotoPage = (pathname: string, adminRoute: string) =>
  pathname.startsWith(formatAdminURL({ adminRoute, path: "/collections/photos/" }));

export function PhotoCloseButton() {
  const { config } = useConfig();
  const pathname = usePathname() ?? "";
  const home = usePhotoHome();
  if (!onPhotoPage(pathname, config.routes.admin)) return null;
  return <CloseLink href={home.href} label={home.label} />;
}

export function PhotoStepNav() {
  const { config } = useConfig();
  const pathname = usePathname() ?? "";
  const { stepNav, setStepNav } = useStepNav();
  const { title } = useDocumentTitle();
  const home = usePhotoHome();
  const active = onPhotoPage(pathname, config.routes.admin);
  const wanted = [...home.crumbs, { label: title || "Photo" }];
  const key = JSON.stringify(wanted);

  // Payload's own nav starts at the Photos list: replace it, and again
  // whenever Payload sets it again.
  useEffect(() => {
    if (active && JSON.stringify(stepNav) !== key) setStepNav(JSON.parse(key));
  }, [active, key, stepNav, setStepNav]);

  return null;
}
