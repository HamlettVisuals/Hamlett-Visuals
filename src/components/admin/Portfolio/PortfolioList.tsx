"use client";

import { useEffect, useState } from "react";
import { Button, Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { StatusToggle } from "@/components/admin/CategoryCells";
import type { PortfolioAlbum, PortfolioCategory, Thumbnail } from "./types";

// The Categories & Albums page (see index.tsx for the data): one section
// per category, collapsed to start, its albums inside. Each header has the
// drag handle, the category's cover, name and album count, its Live/Hidden
// pill (toggles in place), "Edit category" and "+ Add album" (opens a new
// album with this category filled in, CategoryPrefill.tsx). "Other"
// (CRM-only) sits last and muted: Edit only. Search filters in place by
// category name or album title and opens the sections it matches. A
// #category-<slug> link opens and scrolls to that section. Styles:
// .portfolio in admin-overrides.css.

type SectionKey = number | "deleted-categories";

// "14 Jun 2026". Day-only dates are stored at 12:00 UTC, so formatted in
// UTC to keep the day right in every time zone.
const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

function Thumb({ thumbnail, emptyLabel }: { thumbnail: Thumbnail | null; emptyLabel: string }) {
  return thumbnail ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
    <img className="category-thumb portfolio__thumb" src={thumbnail.src} alt={thumbnail.alt} loading="lazy" />
  ) : (
    <span className="category-thumb category-thumb--empty portfolio__thumb" aria-label={emptyLabel} title={emptyLabel} />
  );
}

export default function PortfolioList({
  sections,
  orphans,
}: {
  sections: PortfolioCategory[];
  orphans: PortfolioAlbum[];
}) {
  const { config } = useConfig();
  const adminRoute = config.routes.admin;
  const [open, setOpen] = useState<ReadonlySet<SectionKey>>(() => new Set());
  const [flashId, setFlashId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Open and scroll to the section named in the #hash (#category-<slug>).
  useEffect(() => {
    const reveal = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#category-/, ""));
      const section = sections.find((s) => s.slug === slug);
      if (!section) return;
      setOpen((prev) => new Set(prev).add(section.id));
      setFlashId(section.id);
      requestAnimationFrame(() => document.getElementById(`category-${slug}`)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [sections]);

  const toggle = (key: SectionKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const query = search.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(query);
  const shown = sections
    .map((section) => {
      if (!query || matches(section.name)) return { section, albums: section.albums };
      return { section, albums: section.albums.filter((album) => matches(album.title)) };
    })
    .filter(({ section, albums }) => !query || matches(section.name) || albums.length > 0);
  const shownOrphans = query ? orphans.filter((album) => matches(album.title)) : orphans;

  const categoriesURL = formatAdminURL({ adminRoute, path: "/collections/categories" });
  const albumsURL = formatAdminURL({ adminRoute, path: "/collections/events" });

  return (
    <div className="portfolio">
      <h1 className="portfolio__title">Categories &amp; Albums</h1>
      <div className="categories-list-intro portfolio__intro">
        <p className="categories-list-intro__text">
          Your portfolio: each category is a homepage tile with its own page, and each album is one shoot inside it.
          Drag &#8942;&#8942; to change the order your site shows them in.
        </p>
        <div className="categories-list-intro__actions">
          <Button el="link" to={`${categoriesURL}/create`} buttonStyle="primary" size="medium" margin={false}>
            + Add category
          </Button>
        </div>
      </div>

      <div className="portfolio__search">
        <input
          type="search"
          className="portfolio__search-input"
          placeholder="Search categories and albums"
          aria-label="Search categories and albums"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {query && shown.length === 0 && shownOrphans.length === 0 ? (
        <div className="albums-empty" role="status">
          <h3 className="albums-empty__title">Nothing matches your search</h3>
          <p className="albums-empty__text">No category or album called &ldquo;{search.trim()}&rdquo;.</p>
          <button type="button" className="albums-empty__clear" onClick={() => setSearch("")}>
            Show everything
          </button>
        </div>
      ) : (
        <div className="portfolio__sections">
          {shown.map(({ section, albums }) => (
            <CategorySection
              key={section.id}
              category={section}
              albums={albums}
              // While searching, sections with a matching album open.
              isOpen={open.has(section.id) || (Boolean(query) && albums.length > 0 && !matches(section.name))}
              flash={flashId === section.id}
              onToggle={() => toggle(section.id)}
              categoriesURL={categoriesURL}
              albumsURL={albumsURL}
            />
          ))}
          {shownOrphans.length > 0 && (
            <section className="portfolio__section portfolio__section--muted">
              <div className="portfolio__head">
                <span className="portfolio__handle-slot" />
                <button
                  type="button"
                  className="portfolio__toggle"
                  aria-expanded={open.has("deleted-categories") || Boolean(query)}
                  onClick={() => toggle("deleted-categories")}
                >
                  <span className="portfolio__chevron" aria-hidden="true" />
                  <span className="portfolio__name">In deleted categories</span>
                  <span className="portfolio__count">{shownOrphans.length}</span>
                </button>
              </div>
              {(open.has("deleted-categories") || Boolean(query)) && (
                <ul className="portfolio__albums">
                  {shownOrphans.map((album) => (
                    <AlbumRow key={album.id} album={album} albumsURL={albumsURL} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  albums,
  isOpen,
  flash,
  onToggle,
  categoriesURL,
  albumsURL,
}: {
  category: PortfolioCategory;
  albums: PortfolioAlbum[];
  isOpen: boolean;
  flash: boolean;
  onToggle: () => void;
  categoriesURL: string;
  albumsURL: string;
}) {
  const bodyId = `category-${category.slug}-albums`;
  const editLink = (
    <Link className="portfolio__link" href={`${categoriesURL}/${category.id}`} prefetch={false}>
      Edit category
    </Link>
  );

  if (category.isOther) {
    return (
      <section id={`category-${category.slug}`} className="portfolio__section portfolio__section--muted">
        <div className="portfolio__head">
          <span className="portfolio__handle-slot" />
          <span className="portfolio__toggle portfolio__toggle--static">
            <span className="portfolio__chevron portfolio__chevron--none" aria-hidden="true" />
            <Thumb thumbnail={category.cover} emptyLabel="No cover photo" />
            <span className="portfolio__name">{category.name}</span>
            <span className="portfolio__note">Used by your CRM, not shown on the site</span>
          </span>
          <span className="portfolio__actions">
            <span className="category-status category-status--crm">CRM only</span>
            {editLink}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      id={`category-${category.slug}`}
      className={`portfolio__section${isOpen ? " portfolio__section--open" : ""}${flash ? " portfolio__section--flash" : ""}`}
    >
      <div className="portfolio__head">
        <span className="portfolio__handle" aria-hidden="true" />
        <button type="button" className="portfolio__toggle" aria-expanded={isOpen} aria-controls={bodyId} onClick={onToggle}>
          <span className="portfolio__chevron" aria-hidden="true" />
          <Thumb thumbnail={category.cover} emptyLabel="No cover photo" />
          <span className="portfolio__name">{category.name}</span>
          <span className="portfolio__count" aria-label={`${category.albums.length} albums`}>
            {category.albums.length}
          </span>
        </button>
        <span className="portfolio__actions">
          <StatusToggle
            collectionSlug="categories"
            id={category.id}
            initialPublished={category.published}
            name={category.name}
          />
          {editLink}
          <Link
            className="portfolio__link"
            href={`${albumsURL}/create?category=${category.id}`}
            prefetch={false}
          >
            + Add album
          </Link>
        </span>
      </div>
      {isOpen && (
        <div id={bodyId} className="portfolio__body">
          {albums.length === 0 ? (
            <p className="portfolio__empty">No albums yet</p>
          ) : (
            <ul className="portfolio__albums">
              {albums.map((album) => (
                <AlbumRow key={album.id} album={album} albumsURL={albumsURL} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function AlbumRow({ album, albumsURL }: { album: PortfolioAlbum; albumsURL: string }) {
  return (
    <li className="portfolio__album">
      <span className="portfolio__handle" aria-hidden="true" />
      <Thumb thumbnail={album.thumbnail} emptyLabel="No photos yet" />
      <Link className="portfolio__album-title" href={`${albumsURL}/${album.id}`} prefetch={false}>
        {album.title}
      </Link>
      <span className="portfolio__date">{formatDate(album.date) ?? "No date"}</span>
      <span className="portfolio__status">
        <StatusToggle collectionSlug="events" id={album.id} initialPublished={album.published} name={album.title} />
      </span>
    </li>
  );
}
