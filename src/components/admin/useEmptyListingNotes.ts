"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@payloadcms/ui";
import { stringify } from "qs-esm";
import { LISTING_PAGES } from "@/lib/listing-pages";

// For link rows that follow the empty-page rule (lib/listing-pages.ts): About's
// quick links and the footer links. Counts what each listing page shows, and
// returns LinkRowsEditor's `rowNotes` for a link to one that's empty, which
// the site hides until that page has content.

export function useEmptyListingNotes(): (row: { href?: string }) => string[] {
  const { config } = useConfig();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    let cancelled = false;
    for (const [href, { collection, where }] of Object.entries(LISTING_PAGES)) {
      fetch(`${apiBase}/${collection}/count?${stringify({ where })}`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((body: { totalDocs?: number } | null) => {
          if (!cancelled && typeof body?.totalDocs === "number") {
            setCounts((prev) => ({ ...prev, [href]: body.totalDocs as number }));
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  return (row) => {
    const page = row.href ? LISTING_PAGES[row.href] : undefined;
    return page && row.href && counts[row.href] === 0
      ? [`${page.name} has nothing published yet, so this link is hidden on your site until that page has content.`]
      : [];
  };
}
