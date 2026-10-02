"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button, Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { StatusToggle } from "@/components/admin/CategoryCells";
import { TESTIMONIAL_PICKS_MAX } from "@/lib/teaser-testimonials";
import TestimonialsTabs from "./Tabs";
import type { TestimonialRow, TestimonialSection, Thumbnail } from "./types";

// The grouped Testimonials list (data: index.tsx). Each category is a
// section, its testimonials in her order: drag ⋮⋮ to reorder within it (a
// mouse drag, or press-and-hold on touch, like Categories & Albums), saved
// straight away through /api/testimonials/reorder (no History version,
// lib/reorder-within.ts). A testimonial moves to another category on its
// own page.
//
// Each row: the photo the site shows, name (opens it), a bit of the quote,
// its album, the Published / Hidden pill (toggles in place; hiding also
// takes it off the homepage, Testimonials.ts) and On homepage, with Add to
// / Remove from homepage (the Testimonials Section's picks,
// /api/testimonials/:id/homepage). A failed change shows its reason above
// the list. Styles: .portfolio and .testimonials in admin-overrides.css.

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const transformStyle = (transform: { x: number; y: number } | null, transition?: string): CSSProperties => ({
  transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  transition,
});

async function postJSON<T = unknown>(url: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? data?.errors?.[0]?.message ?? fallback);
  return data as T;
}

function Thumb({ thumbnail }: { thumbnail: Thumbnail | null }) {
  return thumbnail ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
    <img className="category-thumb portfolio__thumb" src={thumbnail.src} alt={thumbnail.alt} loading="lazy" />
  ) : (
    <span className="category-thumb category-thumb--empty portfolio__thumb" aria-label="No photo" title="No photo" />
  );
}

export default function TestimonialsList({
  sections: initialSections,
  reviewOnly,
  reviewCount,
}: {
  sections: TestimonialSection[];
  reviewOnly: boolean;
  reviewCount: number;
}) {
  const { config } = useConfig();
  const router = useRouter();
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  const testimonialsURL = formatAdminURL({ adminRoute: config.routes.admin, path: "/collections/testimonials" });
  const [sections, setSections] = useState(initialSections);
  // Fresh server data (router.refresh()) replaces the local copy, which
  // only runs ahead of it between a change and its save.
  const [syncedFrom, setSyncedFrom] = useState(initialSections);
  if (syncedFrom !== initialSections) {
    setSyncedFrom(initialSections);
    setSections(initialSections);
  }
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const homepageCount = sections.reduce((n, s) => n + s.rows.filter((r) => r.onHomepage).length, 0);
  const updateRow = (id: number, change: Partial<TestimonialRow>) =>
    setSections((current) =>
      current.map((s) => ({ ...s, rows: s.rows.map((r) => (r.id === id ? { ...r, ...change } : r)) })),
    );

  const reorder = (section: TestimonialSection, from: number, to: number) => {
    if (section.id === null) return;
    setError(null);
    const previous = sections;
    const rows = arrayMove(section.rows, from, to);
    setSections(sections.map((s) => (s.id === section.id ? { ...s, rows } : s)));
    postJSON(`${apiBase}/testimonials/reorder`, { category: section.id, order: rows.map((r) => r.id), moved: section.rows[from].id }, "The new order couldn't be saved.")
      .then(() => router.refresh())
      .catch((err: Error) => {
        setSections(previous);
        setError(`The new order wasn't saved: ${err.message}`);
      });
  };

  const setHomepage = (row: TestimonialRow, on: boolean) => {
    setError(null);
    // Said here straight away; the server refuses the same (Testimonials.ts).
    if (on && !row.published) {
      setError(`Publish “${row.clientName}” first: only published testimonials can show on the homepage.`);
      return;
    }
    if (on && homepageCount >= TESTIMONIAL_PICKS_MAX) {
      setError(`The homepage already shows ${TESTIMONIAL_PICKS_MAX} testimonials. Remove one from the homepage first.`);
      return;
    }
    updateRow(row.id, { onHomepage: on });
    postJSON(`${apiBase}/testimonials/${row.id}/homepage`, { on }, "The homepage couldn't be changed.")
      .then(() => router.refresh())
      .catch((err: Error) => {
        updateRow(row.id, { onHomepage: !on });
        setError(err.message);
      });
  };

  const empty = sections.every((s) => s.rows.length === 0);

  return (
    <div className="portfolio testimonials">
      <div className="portfolio__title-row">
        <h1 className="portfolio__title">Testimonials</h1>
        <TestimonialsTabs current={reviewOnly ? "review" : "all"} reviewCount={reviewCount} />
      </div>

      <div className="categories-list-intro portfolio__intro">
        <p className="categories-list-intro__text">
          {reviewOnly
            ? "Testimonials clients sent you, still hidden. Open one to check it, preview it on your page, and turn on Published to approve it."
            : `Shown on your Testimonials page by category. Drag ⋮⋮ to change their order. Up to ${TESTIMONIAL_PICKS_MAX} can also show on your homepage (${homepageCount} now).`}
        </p>
        {!reviewOnly && (
          <div className="categories-list-intro__actions">
            <Button el="link" to={`${testimonialsURL}/create`} buttonStyle="primary" size="medium" margin={false}>
              + Add testimonial
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="portfolio__error" role="alert">
          {error}
        </p>
      )}

      {empty ? (
        <div className="albums-empty" role="status">
          <h3 className="albums-empty__title">{reviewOnly ? "Nothing to review" : "No testimonials yet"}</h3>
          <p className="albums-empty__text">
            {reviewOnly
              ? "When a client sends a testimonial through their request link, it shows up here."
              : "Add one yourself, or send a client a request link from their inquiry."}
          </p>
        </div>
      ) : (
        <div className="portfolio__sections">
          {sections.map((section) => (
            <Section
              key={section.id ?? "none"}
              section={section}
              sensors={sensors}
              canReorder={!reviewOnly && section.id !== null}
              testimonialsURL={testimonialsURL}
              onReorder={(from, to) => reorder(section, from, to)}
              onHomepage={setHomepage}
              onPublished={(row, published) => {
                // Hiding takes it off the homepage on the server too.
                updateRow(row.id, published ? { published } : { published, onHomepage: false });
                router.refresh();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  section,
  sensors,
  canReorder,
  testimonialsURL,
  onReorder,
  onHomepage,
  onPublished,
}: {
  section: TestimonialSection;
  sensors: ReturnType<typeof useSensors>;
  canReorder: boolean;
  testimonialsURL: string;
  onReorder: (from: number, to: number) => void;
  onHomepage: (row: TestimonialRow, on: boolean) => void;
  onPublished: (row: TestimonialRow, published: boolean) => void;
}) {
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = section.rows.findIndex((r) => r.id === active.id);
    const to = section.rows.findIndex((r) => r.id === over.id);
    if (from >= 0 && to >= 0) onReorder(from, to);
  };
  const createHref = section.id !== null ? `${testimonialsURL}/create?category=${section.id}` : null;

  return (
    <section className="portfolio__section portfolio__section--open">
      <div className="portfolio__head">
        <span className="portfolio__handle-slot" />
        <span className="portfolio__toggle portfolio__toggle--static">
          <span className="portfolio__name">{section.name}</span>
          <span className="portfolio__count" aria-label={`${section.rows.length} testimonials`}>
            {section.rows.length}
          </span>
          {!section.published && <span className="portfolio__note">Category hidden, so these don&apos;t show</span>}
        </span>
        {createHref && (
          <span className="portfolio__actions">
            <Link className="portfolio__link" href={createHref} prefetch={false}>
              + Add testimonial
            </Link>
          </span>
        )}
      </div>
      <div className="portfolio__body">
        {section.rows.length === 0 ? (
          <p className="portfolio__empty">No testimonials yet</p>
        ) : (
          <DndContext id={`testimonials-${section.id ?? "none"}`} sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={onDragEnd}>
            <SortableContext items={section.rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ul className="portfolio__albums">
                {section.rows.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    canReorder={canReorder}
                    testimonialsURL={testimonialsURL}
                    onHomepage={onHomepage}
                    onPublished={onPublished}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}

function Row({
  row,
  canReorder,
  testimonialsURL,
  onHomepage,
  onPublished,
}: {
  row: TestimonialRow;
  canReorder: boolean;
  testimonialsURL: string;
  onHomepage: (row: TestimonialRow, on: boolean) => void;
  onPublished: (row: TestimonialRow, published: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !canReorder,
  });
  return (
    <li
      ref={setNodeRef}
      style={transformStyle(transform, transition)}
      className={`portfolio__album testimonials__row${isDragging ? " portfolio__album--dragging" : ""}`}
    >
      {canReorder ? (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="portfolio__handle"
          aria-label={`Drag to reorder ${row.clientName}`}
          title={`Drag to reorder ${row.clientName}`}
          {...attributes}
          {...listeners}
        />
      ) : (
        <span className="portfolio__handle-slot" />
      )}
      <Thumb thumbnail={row.thumbnail} />
      <span className="testimonials__main">
        <Link className="portfolio__album-title" href={`${testimonialsURL}/${row.id}`} prefetch={false}>
          {row.clientName}
        </Link>
        {row.fromClient && <span className="testimonials__source">From client</span>}
        <span className="testimonials__snippet">&ldquo;{row.snippet}&rdquo;</span>
      </span>
      <span className="portfolio__date testimonials__album">{row.albumTitle ?? "No album"}</span>
      <span className="portfolio__status">
        <StatusToggle
          collectionSlug="testimonials"
          id={row.id}
          initialPublished={row.published}
          name={row.clientName}
          onLabel="Published"
          onChange={(published) => onPublished(row, published)}
        />
      </span>
      <span className="testimonials__homepage">
        {row.onHomepage ? (
          <>
            <span className="testimonials__on-homepage">On homepage</span>
            <button type="button" className="testimonials__homepage-action" onClick={() => onHomepage(row, false)}>
              Remove from homepage
            </button>
          </>
        ) : (
          <button type="button" className="testimonials__homepage-action" onClick={() => onHomepage(row, true)}>
            Add to homepage
          </button>
        )}
      </span>
    </li>
  );
}
