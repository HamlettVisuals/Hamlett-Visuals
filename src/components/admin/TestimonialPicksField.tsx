"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { RelationshipFieldClientComponent, ValueWithRelation, Where } from "payload";
import { FieldDescription, FieldError, FieldLabel, RelationshipInput, useConfig, useField } from "@payloadcms/ui";

// The Testimonials Section's "Testimonials" field (globals/TestimonialsTeaser.ts):
// the picks as rows, each with the same always-visible drag handle as
// Categories & Albums and Packages (a mouse drag, or press-and-hold on
// touch; .portfolio__handle in admin-overrides.css) and a Remove button.
// Below them, Payload's own picker adds one at a time, offering only what
// the field's filterOptions allows and nothing already picked; it's
// replaced by a note once TESTIMONIAL_PICKS_MAX are picked. The value is the
// same list of ids Payload's picker kept, so Save, Undo/Redo (EditHistory)
// and Live Preview follow it as before. TestimonialPicksNote (afterInput)
// still names picks that have since been hidden or trashed.

type Id = number | string;
type Info = { id: Id; clientName?: string; quote?: string };

const idOf = (value: unknown): Id | null => {
  const id = value && typeof value === "object" ? (value as { id?: unknown; value?: unknown }).id ?? (value as { value?: unknown }).value : value;
  return typeof id === "number" || typeof id === "string" ? id : null;
};

// Drags only move up and down.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const TestimonialPicksField: RelationshipFieldClientComponent = ({ field, path: pathFromProps, readOnly }) => {
  const { config } = useConfig();
  const {
    customComponents: { AfterInput } = {},
    disabled,
    filterOptions,
    path,
    setValue,
    showError,
    value,
  } = useField<unknown[] | null>({ potentiallyStalePath: pathFromProps });
  const locked = Boolean(readOnly || disabled);
  const max = field.maxRows ?? Infinity;
  const relationTo = Array.isArray(field.relationTo) ? field.relationTo[0] : field.relationTo;
  const ids = useMemo(
    () => (Array.isArray(value) ? value.map(idOf).filter((id): id is Id => id != null) : []),
    [value],
  );
  const idsKey = ids.join(",");

  // Names for the rows: what the picker said when one was added, then the
  // testimonials themselves (incl. trashed ones, which the note explains).
  const [info, setInfo] = useState<Record<string, Info>>({});
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    const params = new URLSearchParams({
      depth: "0",
      trash: "true",
      limit: "10",
      "where[id][in]": idsKey,
      "select[clientName]": "true",
      "select[quote]": "true",
    });
    fetch(`${apiBase}/${relationTo}?${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { docs?: Info[] } | null) => {
        if (cancelled || !body?.docs) return;
        setInfo((prev) => {
          const next = { ...prev };
          for (const doc of body.docs ?? []) next[String(doc.id)] = { ...next[String(doc.id)], ...doc };
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [idsKey, apiBase, relationTo]);

  const sensors = useSensors(
    // A few pixels of movement before a mouse drag starts, so a click on the
    // handle does nothing.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Press-and-hold, like Categories & Albums, so a swipe still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.findIndex((id) => String(id) === active.id);
    const to = ids.findIndex((id) => String(id) === over.id);
    if (from < 0 || to < 0) return;
    setValue(arrayMove(ids, from, to));
  };
  const remove = (id: Id) => {
    const next = ids.filter((other) => other !== id);
    setValue(next.length ? next : null);
  };
  const add = (picked: ValueWithRelation | ValueWithRelation[] | null) => {
    const option = Array.isArray(picked) ? picked[0] : picked;
    const id = idOf(option);
    if (id == null || ids.includes(id) || ids.length >= max) return;
    const label = (option as { label?: unknown }).label;
    if (typeof label === "string") setInfo((prev) => ({ ...prev, [String(id)]: { clientName: label, ...prev[String(id)], id } }));
    setValue([...ids, id]);
  };

  // The picker offers what filterOptions allows, minus what's picked.
  // Keyed on the content, since form state hands back a new object on
  // every change and a new one resets the picker.
  const filterKey = JSON.stringify(filterOptions ?? null);
  const addFilter = useMemo(() => {
    const options = JSON.parse(filterKey) as Record<string, boolean | Where> | null;
    const base = options?.[relationTo];
    if (base === false) return options ?? undefined;
    const and: Where[] = [];
    if (base && typeof base === "object") and.push(base);
    if (ids.length) and.push({ id: { not_in: ids } });
    return { ...options, [relationTo]: and.length ? { and } : true };
  }, [filterKey, relationTo, ids]);

  const label = typeof field.label === "string" ? field.label : "Testimonials";
  const full = ids.length >= max;

  return (
    <div className={`field-type testimonial-picks${showError ? " error" : ""}`} id={`field-${path.replace(/\./g, "__")}`}>
      <FieldLabel label={label} path={path} />
      <FieldError path={path} showError={showError} />
      {ids.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={onDragEnd}>
          <SortableContext items={ids.map(String)} strategy={verticalListSortingStrategy}>
            <ol className="testimonial-picks__list">
              {ids.map((id, i) => (
                <PickRow key={String(id)} id={id} position={i + 1} info={info[String(id)]} locked={locked} onRemove={() => remove(id)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
      {AfterInput}
      {!locked &&
        (full ? (
          <p className="testimonial-picks__full">
            {ids.length} of {max} picked. Remove one to add another.
          </p>
        ) : (
          <RelationshipInput
            // A fresh picker per set of picks: Payload's own reset keeps the
            // option just chosen in its list.
            key={idsKey}
            className="testimonial-picks__add"
            path={`${path}__add`}
            relationTo={[relationTo]}
            hasMany={false}
            value={null}
            onChange={add}
            filterOptions={addFilter}
            formatDisplayedOptions={(groups) => groups.map((group) => group.options).flat()}
            allowCreate={false}
            allowEdit={false}
            isSortable={false}
            placeholder={ids.length ? "Add another testimonial" : "Add a testimonial"}
          />
        ))}
      {field.admin?.description && <FieldDescription description={field.admin.description} path={path} />}
    </div>
  );
};

function PickRow({
  id,
  position,
  info,
  locked,
  onRemove,
}: {
  id: Id;
  position: number;
  info: Info | undefined;
  locked: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: String(id),
    disabled: locked,
  });
  const style: CSSProperties = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
  };
  const name = info?.clientName || (info ? "Untitled testimonial" : "Loading…");
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`testimonial-picks__row${isDragging ? " testimonial-picks__row--dragging" : ""}`}
      data-id={String(id)}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="portfolio__handle"
        aria-label={`Drag to reorder ${name}`}
        title={`Drag to reorder ${name}`}
        disabled={locked}
        {...attributes}
        {...(locked ? {} : listeners)}
      />
      <span className="testimonial-picks__position">{position}</span>
      <span className="testimonial-picks__text">
        <span className="testimonial-picks__name">{name}</span>
        {info?.quote && <span className="testimonial-picks__quote">{info.quote}</span>}
      </span>
      {!locked && (
        <button type="button" className="testimonial-picks__remove" onClick={onRemove} aria-label={`Remove ${name}`}>
          Remove
        </button>
      )}
    </li>
  );
}

export default TestimonialPicksField;
