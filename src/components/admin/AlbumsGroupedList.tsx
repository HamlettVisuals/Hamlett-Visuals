"use client";

import { useEffect } from "react";
import { Link, useConfig, useListDrawerContext, useListQuery } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import GroupedList from "@/components/admin/GroupedList";
import { StatusToggle } from "@/components/admin/CategoryCells";

// The Albums list's body (see AlbumsListView.tsx, which loads the data):
// one collapsible section per category, albums newest first, each row with
// its thumbnail, title, date and Live/Hidden toggle. Search stays Payload's
// own box (the URL's ?search=); the results come back already grouped.

export type AlbumRow = {
  id: number | string;
  title: string;
  date: string | null;
  published: boolean;
  thumbnail: { src: string; alt: string } | null;
};

export type AlbumGroup = {
  key: string;
  /** For #category-<slug> links from the Categories list. */
  anchor?: string;
  categoryId: number | string | null;
  title: string;
  hidden: boolean;
  albums: AlbumRow[];
};

// Payload's search box labels itself "Search by Title" from the searchable
// field's label, with no per-collection override. React only writes the
// placeholder when that label changes, so setting it after each render
// sticks.
const SEARCH_PLACEHOLDER = "Search albums";

// "14 Jun 2026". Day-only dates are stored at 12:00 UTC, so formatted in
// UTC to keep the day right in every time zone.
const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

export default function AlbumsGroupedList({ groups, search }: { groups: AlbumGroup[]; search: string }) {
  const { config } = useConfig();
  const { isInDrawer } = useListDrawerContext();
  const { refineListData } = useListQuery();
  const adminRoute = config.routes.admin;

  useEffect(() => {
    const input = document.getElementById("search-filter-input");
    if (input && input.getAttribute("placeholder") !== SEARCH_PLACEHOLDER) {
      input.setAttribute("placeholder", SEARCH_PLACEHOLDER);
      input.setAttribute("aria-label", SEARCH_PLACEHOLDER);
    }
  });

  // A picker drawer keeps Payload's own table (hidden only while this list
  // is on the page, admin-overrides.css).
  if (isInDrawer) return null;

  // While searching, only categories with a match.
  const shown = search ? groups.filter((group) => group.albums.length > 0) : groups;

  if (search && shown.length === 0) {
    return (
      <div className="albums-grouped">
        <div className="albums-empty" role="status">
          <h3 className="albums-empty__title">No albums match your search</h3>
          <p className="albums-empty__text">Nothing called &ldquo;{search}&rdquo;.</p>
          <button
            type="button"
            className="albums-empty__clear"
            // "" rather than undefined: Payload's search box only resets its
            // own text when the URL's search changes to a string.
            onClick={() => void refineListData({ search: "", page: 1 })}
          >
            Show all albums
          </button>
        </div>
      </div>
    );
  }

  const createURL = formatAdminURL({ adminRoute, path: "/collections/events/create" });

  return (
    <div className="albums-grouped">
      <GroupedList
        sections={shown.map((group) => ({
          key: group.key,
          id: group.anchor,
          title: group.title,
          count: group.albums.length,
          note: group.hidden ? "Hidden" : undefined,
          addHref:
            group.categoryId !== null
              ? `${createURL}?category=${encodeURIComponent(String(group.categoryId))}`
              : undefined,
          addLabel: "+ Add album",
          emptyText: "No albums yet",
          children: (
            <ul className="albums-grouped__rows">
              {group.albums.map((album) => (
                <li key={album.id} className="albums-grouped__row">
                  {album.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
                    <img className="category-thumb albums-grouped__thumb" src={album.thumbnail.src} alt={album.thumbnail.alt} loading="lazy" />
                  ) : (
                    <span
                      className="category-thumb category-thumb--empty albums-grouped__thumb"
                      aria-label="No photos yet"
                      title="No photos yet"
                    />
                  )}
                  <Link
                    className="albums-grouped__title"
                    href={formatAdminURL({ adminRoute, path: `/collections/events/${album.id}` })}
                    prefetch={false}
                  >
                    {album.title}
                  </Link>
                  <span className="albums-grouped__date">{formatDate(album.date) ?? "No date"}</span>
                  <span className="albums-grouped__status">
                    <StatusToggle
                      collectionSlug="events"
                      id={album.id}
                      initialPublished={album.published}
                      name={album.title}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ),
        }))}
      />
    </div>
  );
}
