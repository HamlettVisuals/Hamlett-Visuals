"use client";

import { useEffect, useState } from "react";
import { useConfig, useFormFields } from "@payloadcms/ui";

// Under the Testimonials Teaser's "Testimonials" picker
// (globals/TestimonialsTeaser.ts). The picker only offers testimonials shown
// on the site, but one picked earlier stays in the list if it's later hidden
// or moved to the Trash. The homepage skips it (lib/teaser-testimonials.ts)
// and saving is refused until it's removed (the field's filterOptions), so
// this names each one right away rather than leaving her to guess.

type Info = { id: number; clientName?: string; published?: boolean | null; deletedAt?: string | null };

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id?: number | string }).id : value;

export default function TestimonialPicksNote({ path }: { path: string }) {
  const { config } = useConfig();
  const ids = useFormFields(([fields]) => {
    const value = fields[path]?.value;
    return Array.isArray(value) ? value.map(idOf).filter((id) => id != null).join(",") : "";
  });
  const [fetched, setFetched] = useState<{ ids: string; docs: Info[] } | null>(null);
  // Re-checked when she comes back to this tab, e.g. after hiding one of
  // the picks in the Testimonials list in another tab.
  const [focusCount, setFocusCount] = useState(0);
  useEffect(() => {
    const onFocus = () => setFocusCount((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    const params = new URLSearchParams({
      depth: "0",
      trash: "true",
      limit: "10",
      "where[id][in]": ids,
      "select[clientName]": "true",
      "select[published]": "true",
      "select[deletedAt]": "true",
    });
    fetch(`${apiBase}/testimonials?${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { docs?: Info[] } | null) => {
        if (!cancelled && body) setFetched({ ids, docs: body.docs ?? [] });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ids, apiBase, focusCount]);

  if (!ids || !fetched || fetched.ids !== ids) return null;

  const messages = ids.split(",").flatMap((id) => {
    const doc = fetched.docs.find((d) => String(d.id) === id);
    if (!doc) return ["One pick has been deleted. Remove it to save."];
    const name = doc.clientName ? `"${doc.clientName}"` : "One pick";
    if (doc.deletedAt) return [`${name} is in the Trash, so it isn't shown. Remove it to save.`];
    if (doc.published === false) return [`${name} is hidden on your site, so it isn't shown. Remove it to save.`];
    return [];
  });

  return messages.length ? (
    <div className="testimonial-picks-note" role="status">
      {messages.map((message, i) => (
        <p key={i}>Unavailable: {message}</p>
      ))}
    </div>
  ) : null;
}
