"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button, Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { StatusToggle } from "@/components/admin/CategoryCells";
import PortfolioTabs from "./Tabs";
import type { PortfolioAlbum, PortfolioCategory, Thumbnail } from "./types";

// The Categories & Albums page (see index.tsx for the data): one section
// per category, collapsed to start, its albums inside. Each header has the
// drag handle, the category's cover, name and album count, its Live/Hidden
// pill (toggles in place), "Edit category" and "+ Add album" (opens a new
// album with this category filled in, CategoryPrefill.tsx). "Other"
// (CRM-only) sits last and muted: Edit only, no handle. Search filters in
// place by category name or album title and opens the sections it matches.
// A #category-<slug> link opens and scrolls to that section. Styles:
// .portfolio in admin-overrides.css.
//
// Reordering: grab a handle (a mouse drag, or press-and-hold on touch, the
// same as the kanban board's cards). Grabbing a category collapses every
// section so the whole list is in view; dropping puts back whatever was
// open. Albums reorder the same way inside an open section, and only within
// it. Each drop saves straight away (/api/categories/reorder-categories or
// /api/events/reorder-albums, see lib/reorder-within.ts; a reorder adds no
// History version); if the save fails the order goes back and the reason
// shows above the list. Reordering is off while searching, since
// only part of the list is showing.

type SectionKey = number | "deleted-categories";

// "14 Jun 2026". Day-only dates are stored at 12:00 UTC, so formatted in
// UTC to keep the day right in every time zone.
const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

// Drags only move up and down.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const transformStyle = (transform: { x: number; y: number } | null, transition?: string): CSSProperties => ({
  transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  transition,
});

function useDragSensors() {
  return useSensors(
    // A few pixels of movement before a mouse drag starts, so a click on the
    // handle does nothing.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Press-and-hold, like the kanban board, so a swipe still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function Thumb({ thumbnail, emptyLabel }: { thumbnail: Thumbnail | null; emptyLabel: string }) {
  return thumbnail ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
    <img className="category-thumb portfolio__thumb" src={thumbnail.src} alt={thumbnail.alt} loading="lazy" />
  ) : (
    <span className="category-thumb category-thumb--empty portfolio__thumb" aria-label={emptyLabel} title={emptyLabel} />
  );
}

async function postJSON(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? data?.errors?.[0]?.message ?? "The new order couldn't be saved.");
  }
}

export default function PortfolioList({
  sections: initialSections,
  orphans,
}: {
  sections: PortfolioCategory[];
  orphans: PortfolioAlbum[];
}) {
  const { config } = useConfig();
  const router = useRouter();
  const adminRoute = config.routes.admin;
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  const [sections, setSections] = useState(initialSections);
  // Fresh data from the server (router.refresh() after a save) replaces
  // the local copy; the copy only runs ahead of it between a drop and its
  // save.
  const [syncedFrom, setSyncedFrom] = useState(initialSections);
  if (syncedFrom !== initialSections) {
    setSyncedFrom(initialSections);
    setSections(initialSections);
  }
  const [open, setOpen] = useState<ReadonlySet<SectionKey>>(() => new Set());
  const [flashId, setFlashId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draggingCategory, setDraggingCategory] = useState<number | null>(null);
  const openBeforeDrag = useRef<ReadonlySet<SectionKey> | null>(null);
  const sensors = useDragSensors();

  // Open and scroll to the section named in the #hash (#category-<slug>).
  useEffect(() => {
    const reveal = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#category-/, ""));
      const section = initialSections.find((s) => s.slug === slug);
      if (!section) return;
      setOpen((prev) => new Set(prev).add(section.id));
      setFlashId(section.id);
      requestAnimationFrame(() => document.getElementById(`category-${slug}`)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [initialSections]);

  const toggle = (key: SectionKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // --- Category drag
  const onCategoryDragStart = ({ active }: DragStartEvent) => {
    setError(null);
    openBeforeDrag.current = open;
    setOpen(new Set());
    setDraggingCategory(Number(active.id));
  };

  const endCategoryDrag = () => {
    setDraggingCategory(null);
    setOpen(openBeforeDrag.current ?? new Set());
    openBeforeDrag.current = null;
  };

  const onCategoryDragCancel = () => endCategoryDrag();

  const onCategoryDragEnd = ({ active, over }: DragEndEvent) => {
    endCategoryDrag();
    if (!over || active.id === over.id) return;

    const previous = sections;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    const next = arrayMove(sections, from, to);
    setSections(next);

    void postJSON(`${apiBase}/categories/reorder-categories`, {
      order: next.map((s) => s.id),
      moved: active.id,
    })
      .then(() => router.refresh())
      .catch((err: Error) => {
        setSections(previous);
        setError(err.message);
      });
  };

  // --- Album drag (within one category)
  const onAlbumsReordered = (categoryId: number, from: number, to: number) => {
    setError(null);
    const previous = sections;
    const section = sections.find((s) => s.id === categoryId);
    if (!section) return;
    const albums = arrayMove(section.albums, from, to);
    setSections(sections.map((s) => (s.id === categoryId ? { ...s, albums } : s)));
    void postJSON(`${apiBase}/events/reorder-albums`, {
      category: categoryId,
      order: albums.map((album) => album.id),
      moved: section.albums[from].id,
    })
      .then(() => router.refresh())
      .catch((err: Error) => {
        setSections(previous);
        setError(err.message);
      });
  };

  const query = search.trim().toLowerCase();
  const searching = Boolean(query);
  const matches = (text: string) => text.toLowerCase().includes(query);
  const shown = sections
    .map((section) => {
      if (!searching || matches(section.name)) return { section, albums: section.albums };
      return { section, albums: section.albums.filter((album) => matches(album.title)) };
    })
    .filter(({ section, albums }) => !searching || matches(section.name) || albums.length > 0);
  const shownOrphans = searching ? orphans.filter((album) => matches(album.title)) : orphans;
  const sortableIds = shown.filter(({ section }) => !section.isOther).map(({ section }) => section.id);
  const dragged = sections.find((s) => s.id === draggingCategory);

  const categoriesURL = formatAdminURL({ adminRoute, path: "/collections/categories" });
  const albumsURL = formatAdminURL({ adminRoute, path: "/collections/events" });

  return (
    <div className="portfolio">
      <div className="portfolio__title-row">
        <h1 className="portfolio__title">Categories &amp; Albums</h1>
        <PortfolioTabs current="all" />
      </div>
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

      {error && (
        <p className="portfolio__error" role="alert">
          The new order wasn&apos;t saved: {error}
        </p>
      )}

      {searching && shown.length === 0 && shownOrphans.length === 0 ? (
        <div className="albums-empty" role="status">
          <h3 className="albums-empty__title">Nothing matches your search</h3>
          <p className="albums-empty__text">No category or album called &ldquo;{search.trim()}&rdquo;.</p>
          <button type="button" className="albums-empty__clear" onClick={() => setSearch("")}>
            Show everything
          </button>
        </div>
      ) : (
        <DndContext
          id="portfolio-categories"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[verticalOnly]}
          // Sections collapse as the drag starts, so everything moves:
          // measure again while dragging.
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={onCategoryDragStart}
          onDragEnd={onCategoryDragEnd}
          onDragCancel={onCategoryDragCancel}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="portfolio__sections">
              {shown.map(({ section, albums }) => (
                <CategorySection
                  key={section.id}
                  category={section}
                  albums={albums}
                  // While searching, sections with a matching album open.
                  isOpen={open.has(section.id) || (searching && albums.length > 0 && !matches(section.name))}
                  flash={flashId === section.id}
                  canReorder={!searching}
                  sensors={sensors}
                  onToggle={() => toggle(section.id)}
                  onAlbumsReordered={(from, to) => onAlbumsReordered(section.id, from, to)}
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
                      aria-expanded={open.has("deleted-categories") || searching}
                      onClick={() => toggle("deleted-categories")}
                    >
                      <span className="portfolio__chevron" aria-hidden="true" />
                      <span className="portfolio__name">In deleted categories</span>
                      <span className="portfolio__count">{shownOrphans.length}</span>
                    </button>
                  </div>
                  {(open.has("deleted-categories") || searching) && (
                    <ul className="portfolio__albums">
                      {shownOrphans.map((album) => (
                        <li key={album.id} className="portfolio__album">
                          <span className="portfolio__handle-slot" />
                          <AlbumRowContent album={album} albumsURL={albumsURL} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </SortableContext>
          <DragOverlay>{dragged ? <CategoryHeader category={dragged} lifted /> : null}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

// The header's contents without its buttons' behaviour: what's lifted
// while a category is being dragged.
function CategoryHeader({ category, lifted = false }: { category: PortfolioCategory; lifted?: boolean }) {
  return (
    <div className={`portfolio__head${lifted ? " portfolio__head--lifted" : ""}`}>
      <span className="portfolio__handle" aria-hidden="true" />
      <span className="portfolio__toggle">
        <span className="portfolio__chevron" aria-hidden="true" />
        <Thumb thumbnail={category.cover} emptyLabel="No cover photo" />
        <span className="portfolio__name">{category.name}</span>
        <span className="portfolio__count">{category.albums.length}</span>
      </span>
    </div>
  );
}

function DragHandle({
  label,
  disabled,
  setRef,
  attributes,
  listeners,
}: {
  label: string;
  disabled: boolean;
  setRef: (node: HTMLElement | null) => void;
  attributes: object;
  listeners: object | undefined;
}) {
  return (
    <button
      ref={setRef}
      type="button"
      className="portfolio__handle"
      aria-label={label}
      title={disabled ? "Clear the search to reorder" : label}
      disabled={disabled}
      {...attributes}
      {...(disabled ? {} : listeners)}
    />
  );
}

function CategorySection({
  category,
  albums,
  isOpen,
  flash,
  canReorder,
  sensors,
  onToggle,
  onAlbumsReordered,
  categoriesURL,
  albumsURL,
}: {
  category: PortfolioCategory;
  albums: PortfolioAlbum[];
  isOpen: boolean;
  flash: boolean;
  canReorder: boolean;
  sensors: ReturnType<typeof useDragSensors>;
  onToggle: () => void;
  onAlbumsReordered: (from: number, to: number) => void;
  categoriesURL: string;
  albumsURL: string;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: category.isOther || !canReorder,
  });
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

  const onAlbumDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = albums.findIndex((a) => a.id === active.id);
    const to = albums.findIndex((a) => a.id === over.id);
    if (from >= 0 && to >= 0) onAlbumsReordered(from, to);
  };

  return (
    <section
      ref={setNodeRef}
      style={transformStyle(transform, transition)}
      id={`category-${category.slug}`}
      className={`portfolio__section${isOpen ? " portfolio__section--open" : ""}${flash ? " portfolio__section--flash" : ""}${
        isDragging ? " portfolio__section--placeholder" : ""
      }`}
    >
      <div className="portfolio__head">
        <DragHandle
          label={`Drag to reorder ${category.name}`}
          disabled={!canReorder}
          setRef={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
        />
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
          <Link className="portfolio__link" href={`${albumsURL}/create?category=${category.id}`} prefetch={false}>
            + Add album
          </Link>
        </span>
      </div>
      {isOpen && (
        <div id={bodyId} className="portfolio__body">
          {albums.length === 0 ? (
            <p className="portfolio__empty">No albums yet</p>
          ) : (
            // Its own drag context, so an album can only move within its
            // category (moving it to another is done on the album's page).
            <DndContext
              id={`portfolio-albums-${category.id}`}
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[verticalOnly]}
              onDragEnd={onAlbumDragEnd}
            >
              <SortableContext items={albums.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                <ul className="portfolio__albums">
                  {albums.map((album) => (
                    <SortableAlbumRow key={album.id} album={album} albumsURL={albumsURL} canReorder={canReorder} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </section>
  );
}

function SortableAlbumRow({ album, albumsURL, canReorder }: { album: PortfolioAlbum; albumsURL: string; canReorder: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
    disabled: !canReorder,
  });
  return (
    <li
      ref={setNodeRef}
      style={transformStyle(transform, transition)}
      className={`portfolio__album${isDragging ? " portfolio__album--dragging" : ""}`}
    >
      <DragHandle
        label={`Drag to reorder ${album.title}`}
        disabled={!canReorder}
        setRef={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
      />
      <AlbumRowContent album={album} albumsURL={albumsURL} />
    </li>
  );
}

function AlbumRowContent({ album, albumsURL }: { album: PortfolioAlbum; albumsURL: string }): ReactNode {
  return (
    <>
      <Thumb thumbnail={album.thumbnail} emptyLabel="No photos yet" />
      <Link className="portfolio__album-title" href={`${albumsURL}/${album.id}`} prefetch={false}>
        {album.title}
      </Link>
      <span className="portfolio__date">{formatDate(album.date) ?? "No date"}</span>
      <span className="portfolio__status">
        <StatusToggle collectionSlug="events" id={album.id} initialPublished={album.published} name={album.title} />
      </span>
    </>
  );
}
