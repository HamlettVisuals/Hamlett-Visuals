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
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import type { RelationshipFieldClientComponent } from "payload";
import { FieldDescription, FieldError, FieldLabel, useConfig, useField, useFormFields } from "@payloadcms/ui";
import { BOTH_ACCOUNTS_POSTS } from "@/lib/instagram-layout";
import { rowPathOf, useInstagramStatus } from "./store";

// An Instagram account's "Featured posts" (globals/InstagramSection.ts): her
// picks as a grid of thumbnails in homepage order, each with the same
// always-visible drag handle as Categories & Albums and the Testimonials
// Section (a mouse drag, or press-and-hold on touch; .portfolio__handle in
// admin-overrides.css) and a Remove button. "Add posts" opens that
// account's synced posts below to tap. The value is the same list of ids
// Payload's own picker keeps, so Save, Undo/Redo and History follow it.

type Id = number;
type Post = {
  id: Id;
  caption?: string | null;
  mediaType?: "image" | "video" | "carousel";
  isMock?: boolean | null;
  postedAt?: string;
  sizes?: { thumbnail?: { url?: string | null } };
  url?: string | null;
};

const idOf = (value: unknown): Id | null => {
  const id = value && typeof value === "object" ? ((value as { id?: unknown; value?: unknown }).id ?? (value as { value?: unknown }).value) : value;
  return typeof id === "number" ? id : typeof id === "string" && /^\d+$/.test(id) ? Number(id) : null;
};

const thumbOf = (post: Post | undefined) => post?.sizes?.thumbnail?.url ?? post?.url ?? null;
const TYPE_LABEL = { video: "Video", carousel: "Carousel" } as const;

const FeaturedField: RelationshipFieldClientComponent = ({ field, path: pathFromProps, readOnly }) => {
  const { config } = useConfig();
  const { disabled, path, setValue, showError, value } = useField<unknown[] | null>({ potentiallyStalePath: pathFromProps });
  const rowPath = rowPathOf(path);
  const slot = useFormFields(([fields]) => Number(fields[`${rowPath}.slot`]?.value) || 0);
  const otherVisible = useFormFields(([fields]) =>
    Object.entries(fields).some(([key, f]) => /^accounts\.\d+\.visible$/.test(key) && !key.startsWith(`${rowPath}.`) && f.value === true),
  );
  const ownVisible = useFormFields(([fields]) => fields[`${rowPath}.visible`]?.value === true);
  const { status, version } = useInstagramStatus();
  const connected = status?.accounts.find((a) => a.slot === slot)?.status === "connected";
  const bothShown =
    ownVisible && otherVisible && (status?.accounts.filter((a) => a.status === "connected").length ?? 0) === 2;
  const locked = Boolean(readOnly || disabled);
  const max = field.maxRows ?? 9;
  const ids = useMemo(() => (Array.isArray(value) ? value.map(idOf).filter((id): id is Id => id != null) : []), [value]);

  // This account's synced posts, newest first (at most 50 plus anything
  // featured, lib/instagram-prune.ts). Mock ones only where they're allowed.
  const [posts, setPosts] = useState<Post[] | null>(null);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  const mockAllowed = status?.mockAllowed;
  useEffect(() => {
    if (!slot || mockAllowed === undefined) return;
    let cancelled = false;
    const params = new URLSearchParams({
      depth: "0",
      limit: "100",
      sort: "-postedAt",
      "where[connection.slot][equals]": String(slot),
      "select[caption]": "true",
      "select[mediaType]": "true",
      "select[isMock]": "true",
      "select[postedAt]": "true",
      "select[sizes]": "true",
      "select[url]": "true",
    });
    if (!mockAllowed) params.set("where[isMock][not_equals]", "true");
    fetch(`${apiBase}/instagram-posts?${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { docs?: Post[] } | null) => {
        if (!cancelled) setPosts(body?.docs ?? []);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, slot, mockAllowed, version]);
  const byId = useMemo(() => new Map((posts ?? []).map((post) => [post.id, post])), [posts]);

  const [adding, setAdding] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.findIndex((id) => String(id) === active.id);
    const to = ids.findIndex((id) => String(id) === over.id);
    if (from >= 0 && to >= 0) setValue(arrayMove(ids, from, to));
  };
  const remove = (id: Id) => {
    const next = ids.filter((other) => other !== id);
    setValue(next.length ? next : null);
  };
  const add = (id: Id) => {
    if (ids.includes(id) || ids.length >= max) return;
    setValue([...ids, id]);
    if (ids.length + 1 >= max) setAdding(false);
  };

  const label = typeof field.label === "string" ? field.label : "Featured posts";
  const full = ids.length >= max;
  const available = (posts ?? []).filter((post) => !ids.includes(post.id));

  return (
    <div className={`field-type ig-featured${showError ? " error" : ""}`} id={`field-${path.replace(/\./g, "__")}`}>
      <FieldLabel label={label} path={path} />
      <FieldError path={path} showError={showError} />
      {bothShown && ids.length > BOTH_ACCOUNTS_POSTS && (
        <p className="ig-featured__note" role="status">
          Showing {BOTH_ACCOUNTS_POSTS} of {ids.length} while both accounts are visible.
        </p>
      )}
      {ids.length > 0 && (
        <DndContext id={`ig-featured-${slot}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids.map(String)} strategy={rectSortingStrategy}>
            <ol className="ig-featured__grid">
              {ids.map((id, i) => (
                <PickTile
                  key={id}
                  id={id}
                  position={i + 1}
                  post={byId.get(id)}
                  loading={posts === null}
                  muted={bothShown && i >= BOTH_ACCOUNTS_POSTS}
                  locked={locked}
                  onRemove={() => remove(id)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
      {!locked && connected && (
        <div className="ig-featured__controls">
          {full ? (
            <p className="ig-featured__hint">
              {ids.length} of {max} picked. Remove one to add another.
            </p>
          ) : (
            <button type="button" className="ig-account__button" aria-expanded={adding} onClick={() => setAdding(!adding)}>
              {adding ? "Done adding" : ids.length ? "Add more posts" : "Add posts"}
            </button>
          )}
        </div>
      )}
      {!connected && status && <p className="ig-featured__hint">Connect this account to pick its posts.</p>}
      {adding && !full && (
        <div className="ig-featured__choices">
          {posts === null ? (
            <p className="ig-featured__hint">Loading posts…</p>
          ) : available.length === 0 ? (
            <p className="ig-featured__hint">{posts.length ? "Every synced post is already picked." : "No posts synced yet. Try Sync now."}</p>
          ) : (
            <>
              <p className="ig-featured__hint">Tap a post to add it to the end.</p>
              <ul className="ig-featured__grid">
                {available.map((post) => (
                  <li key={post.id}>
                    <button
                      type="button"
                      className="ig-featured__choice"
                      onClick={() => add(post.id)}
                      aria-label={`Add ${post.caption || "post"}`}
                      title={post.caption ?? undefined}
                    >
                      <Thumb post={post} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {field.admin?.description && <FieldDescription description={field.admin.description} path={path} />}
    </div>
  );
};

function Thumb({ post }: { post: Post | undefined }) {
  const src = thumbOf(post);
  const type = post?.mediaType && post.mediaType !== "image" ? TYPE_LABEL[post.mediaType] : null;
  return (
    <span className="ig-featured__thumb">
      {src ? (
        // A plain <img>: the studio's thumbnails are already small (320×400).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" />
      ) : null}
      {type && <span className="ig-featured__type">{type}</span>}
    </span>
  );
}

function PickTile({
  id,
  position,
  post,
  loading,
  muted,
  locked,
  onRemove,
}: {
  id: Id;
  position: number;
  post: Post | undefined;
  loading: boolean;
  muted: boolean;
  locked: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: String(id),
    disabled: locked,
  });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  const name = post?.caption || (loading ? "Loading…" : "Unavailable post");
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`ig-featured__tile${isDragging ? " ig-featured__tile--dragging" : ""}${muted ? " ig-featured__tile--muted" : ""}`}
      data-id={id}
      title={post?.caption ?? undefined}
    >
      <Thumb post={post} />
      {!post && !loading && <span className="ig-featured__missing">Unavailable. Remove it to save.</span>}
      <span className="ig-featured__position">{position}</span>
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="portfolio__handle ig-featured__handle"
        aria-label={`Drag to reorder ${name}`}
        title="Drag to reorder"
        disabled={locked}
        {...attributes}
        {...(locked ? {} : listeners)}
      />
      {!locked && (
        <button type="button" className="ig-featured__remove" onClick={onRemove} aria-label={`Remove ${name}`}>
          Remove
        </button>
      )}
    </li>
  );
}

export default FeaturedField;
