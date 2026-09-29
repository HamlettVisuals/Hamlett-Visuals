"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@payloadcms/ui";

// A list split into collapsible sections, each with a heading, a count, an
// optional "+ Add …" link and its own empty message. Built for the Albums
// list (category → albums, see AlbumsGroupedList.tsx) and meant to be reused
// for Photos later (category → album → photos): a section's `children` can
// be rows, a grid, or another GroupedList. Sections start expanded; which
// ones are collapsed isn't remembered between visits. A section whose `id`
// is in the URL's #hash is opened and scrolled to (the Categories list
// links here that way). Styles: .grouped-list in admin-overrides.css.

export type GroupedListSection = {
  key: string;
  /** The element id, for #hash links. */
  id?: string;
  title: string;
  count: number;
  /** Small text after the count, e.g. "Hidden". */
  note?: string;
  addHref?: string;
  addLabel?: string;
  emptyText: string;
  children?: ReactNode;
};

export default function GroupedList({ sections }: { sections: GroupedListSection[] }) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [flashId, setFlashId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  // The section a #hash asked for, for a moment after arriving: Payload's
  // list view rewrites the URL with its default query on load, which drops
  // the hash and scrolls back to the top, so the scroll is applied again
  // once that has happened.
  const pendingId = useRef<string | null>(null);

  // Open and scroll to the section named in the #hash, on load and when the
  // hash changes.
  useEffect(() => {
    let timer: number | undefined;
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const section = sections.find((s) => s.id && s.id === id);
      if (!section) return;
      setCollapsed((prev) => {
        if (!prev.has(section.key)) return prev;
        const next = new Set(prev);
        next.delete(section.key);
        return next;
      });
      setFlashId(id);
      pendingId.current = id;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => (pendingId.current = null), 2000);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => {
      window.removeEventListener("hashchange", reveal);
      window.clearTimeout(timer);
    };
  }, [sections]);

  useEffect(() => {
    const id = pendingId.current;
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, [searchParams]);

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="grouped-list">
      {sections.map((section) => {
        const open = !collapsed.has(section.key);
        const bodyId = `${section.id ?? section.key}-body`;
        return (
          <section
            key={section.key}
            id={section.id}
            className={`grouped-list__section${section.id && flashId === section.id ? " grouped-list__section--flash" : ""}`}
          >
            <div className="grouped-list__head">
              <button
                type="button"
                className="grouped-list__toggle"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => toggle(section.key)}
              >
                <span className="grouped-list__chevron" aria-hidden="true" />
                <span className="grouped-list__title">{section.title}</span>
                <span className="grouped-list__count">{section.count}</span>
                {section.note && <span className="grouped-list__note">{section.note}</span>}
              </button>
              {section.addHref && (
                <Link href={section.addHref} className="grouped-list__add" prefetch={false}>
                  {section.addLabel ?? "+ Add"}
                </Link>
              )}
            </div>
            <div id={bodyId} className="grouped-list__body" hidden={!open}>
              {section.count === 0 ? <p className="grouped-list__empty">{section.emptyText}</p> : section.children}
            </div>
          </section>
        );
      })}
    </div>
  );
}
