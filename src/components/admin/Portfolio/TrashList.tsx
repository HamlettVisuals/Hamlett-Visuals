"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationModal, toast, useConfig, useModal } from "@payloadcms/ui";
import PortfolioTabs from "./Tabs";
import type { Thumbnail } from "./types";

// The Trash tab of Categories & Albums (data from Trash.tsx): deleted
// categories, albums and photos in three sections. Restore and Delete
// permanently send the same requests as Payload's own Trash buttons (a
// PATCH setting deletedAt to null, or a DELETE, each limited to that one
// id and only while it's still in the Trash), so the collections' own rules
// still apply: a category can't be permanently deleted while albums use it,
// and that message is shown as it comes back.
//
// A photo's Delete permanently first asks where it's still used
// (GET /api/photos/<id>/usage, lib/photo-usage.ts): a photo can be in the
// Trash while still set as a cover or on a slide, and deleting it for good
// leaves those places empty, so the confirmation lists them. Deleting it
// also removes its file and thumbnail from storage (the R2 plugin does that
// on every permanent delete).

export type TrashItem = {
  id: number;
  title: string;
  deletedAt: string | null;
  thumbnail: Thumbnail | null;
  /** Albums: their category's name. */
  note: string | null;
};

type Collection = "categories" | "events" | "photos";
type Pending = { collection: Collection; item: TrashItem; uses?: string[] } | null;

const MODAL_SLUG = "portfolio-trash-delete";

const formatDeleted = (value: string | null) =>
  value
    ? `Deleted ${new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : "Deleted";

// ?trash=true&where[and][0][id][equals]=<id>&where[and][1][deletedAt][exists]=true
const trashedOnly = (id: number) =>
  new URLSearchParams({
    trash: "true",
    "where[and][0][id][equals]": String(id),
    "where[and][1][deletedAt][exists]": "true",
  }).toString();

async function send(url: string, method: "PATCH" | "DELETE", body?: object): Promise<void> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  const message = json?.errors?.[0]?.message ?? (res.ok ? null : "Something went wrong. Try again.");
  if (message) throw new Error(message);
}

export default function TrashList({
  categories,
  albums,
  photos,
}: {
  categories: TrashItem[];
  albums: TrashItem[];
  photos: TrashItem[];
}) {
  const { config } = useConfig();
  const router = useRouter();
  const { openModal } = useModal();
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const noun = (collection: Collection) =>
    collection === "categories" ? "Category" : collection === "events" ? "Album" : "Photo";

  const askToDeleteForever = async (collection: Collection, item: TrashItem) => {
    if (collection !== "photos") {
      setPending({ collection, item });
      openModal(MODAL_SLUG);
      return;
    }
    setBusy(`${collection}-${item.id}`);
    try {
      const res = await fetch(`${apiBase}/photos/${item.id}/usage`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Couldn't check where this photo is used.");
      setPending({ collection, item, uses: json.uses as string[] });
      openModal(MODAL_SLUG);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't check where this photo is used.");
    } finally {
      setBusy(null);
    }
  };

  const restore = async (collection: Collection, item: TrashItem) => {
    setBusy(`${collection}-${item.id}`);
    try {
      await send(`${apiBase}/${collection}?${trashedOnly(item.id)}`, "PATCH", { deletedAt: null });
      toast.success(`${noun(collection)} "${item.title}" restored.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restore it.");
    } finally {
      setBusy(null);
    }
  };

  const deleteForever = async () => {
    if (!pending) return;
    const { collection, item } = pending;
    setBusy(`${collection}-${item.id}`);
    try {
      await send(`${apiBase}/${collection}?${trashedOnly(item.id)}`, "DELETE");
      toast.success(`${noun(collection)} "${item.title}" permanently deleted.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete it.");
    } finally {
      setBusy(null);
      setPending(null);
    }
  };

  const section = (collection: Collection, title: string, items: TrashItem[], empty: string) => (
    <section className="portfolio__section portfolio__section--open portfolio-trash__section" aria-label={title}>
      <div className="portfolio__head">
        <span className="portfolio__name portfolio-trash__heading">{title}</span>
        <span className="portfolio__count">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="portfolio__empty portfolio-trash__empty">{empty}</p>
      ) : (
        <ul className="portfolio__albums">
          {items.map((item) => {
            const key = `${collection}-${item.id}`;
            return (
              <li key={key} className="portfolio-trash__row">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
                  <img className="category-thumb" src={item.thumbnail.src} alt={item.thumbnail.alt} loading="lazy" />
                ) : (
                  <span className="category-thumb category-thumb--empty" aria-hidden="true" />
                )}
                <span className="portfolio-trash__text">
                  <span className="portfolio-trash__title">{item.title}</span>
                  <span className="portfolio-trash__meta">
                    {[item.note, formatDeleted(item.deletedAt)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="portfolio-trash__actions">
                  <button
                    type="button"
                    className="portfolio-trash__button"
                    disabled={busy === key}
                    onClick={() => void restore(collection, item)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="portfolio-trash__button portfolio-trash__button--danger"
                    disabled={busy === key}
                    onClick={() => void askToDeleteForever(collection, item)}
                  >
                    Delete permanently
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div className="portfolio">
      <div className="portfolio__title-row">
        <h1 className="portfolio__title">Categories &amp; Albums</h1>
        <PortfolioTabs current="trash" />
      </div>
      <p className="portfolio-trash__intro">
        Deleted categories, albums and photos wait here until you restore them or delete them permanently. A
        category can only be deleted permanently once no album uses it. A restored photo goes back to its album, if
        that album still exists.
      </p>
      <div className="portfolio__sections">
        {section("categories", "Deleted categories", categories, "No deleted categories.")}
        {section("events", "Deleted albums", albums, "No deleted albums.")}
        {section("photos", "Deleted photos", photos, "No deleted photos.")}
      </div>
      <ConfirmationModal
        modalSlug={MODAL_SLUG}
        heading={pending ? `Permanently delete "${pending.item.title}"?` : "Permanently delete?"}
        body={
          pending?.collection === "events" ? (
            "This can't be undone. Its photos stay, no longer in any album; any not used elsewhere show under Unused photos."
          ) : pending?.collection === "photos" ? (
            <>
              <p>This can&apos;t be undone. The photo file is removed from storage too.</p>
              {pending.uses?.length ? (
                <>
                  <p>It&apos;s still used as:</p>
                  <ul className="album-photos__uses">
                    {pending.uses.map((use) => (
                      <li key={use}>{use}</li>
                    ))}
                  </ul>
                  <p>Those places will be left without a photo.</p>
                </>
              ) : null}
            </>
          ) : (
            "This can't be undone."
          )
        }
        confirmLabel="Delete permanently"
        onConfirm={deleteForever}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
