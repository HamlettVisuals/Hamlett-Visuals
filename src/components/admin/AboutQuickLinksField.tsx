"use client";

import { useEffect, useState } from "react";
import type { ArrayFieldClientComponent } from "payload";
import { useConfig } from "@payloadcms/ui";
import {
  QUICK_LINK_LABEL_MAX,
  QUICK_LINK_TITLE_MAX,
  QUICK_LINKS_MAX,
} from "@/lib/about-limits";
import LinkRowsEditor from "@/components/admin/LinkRowsEditor";

// The About global's quick links (globals/About.ts → quickLinks): the same
// compact rows as Header/Nav's menu links (LinkRowsEditor), with a small
// label and a title per link. The card's icon follows the destination on
// the site (lib/quick-link-icons.tsx), so there's nothing to pick here.
//
// A link to Backstage or Testimonials gets a gentle note while that page
// has nothing published, since the card would open an empty page. The link
// stays on the site either way; it's her call.

const TEXT_FIELDS = [
  { name: "label", placeholder: "Small label", max: QUICK_LINK_LABEL_MAX },
  { name: "title", placeholder: "Title", max: QUICK_LINK_TITLE_MAX },
];

// Pages that list a collection's published items; the site shows only
// `published: true` ones (app/(site)/backstage, app/(site)/testimonials).
const LISTING_PAGES: Record<string, { collection: string; name: string }> = {
  "/backstage": { collection: "backstage", name: "Backstage" },
  "/testimonials": { collection: "testimonials", name: "Testimonials" },
};

function usePublishedCounts() {
  const { config } = useConfig();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    let cancelled = false;
    for (const [href, { collection }] of Object.entries(LISTING_PAGES)) {
      const params = new URLSearchParams({
        "where[published][equals]": "true",
        limit: "1",
        depth: "0",
        "select[id]": "true",
      });
      fetch(`${apiBase}/${collection}?${params}`, { credentials: "include" })
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

  return counts;
}

const AboutQuickLinksField: ArrayFieldClientComponent = (props) => {
  const counts = usePublishedCounts();

  return (
    <LinkRowsEditor
      fieldProps={props}
      className="nav-links--quick"
      title="Quick links"
      intro="The link cards under your bio. Each card's icon follows where it goes. Drag to reorder; remove them all to hide the cards."
      textFields={TEXT_FIELDS}
      maxRows={QUICK_LINKS_MAX}
      capHint={`${QUICK_LINKS_MAX} links is the most that fit beside your photo on a computer screen. Remove one to add another.`}
      summarize={(row, destination) =>
        `${row.label?.trim() || "Untitled link"} → ${row.title?.trim() || "no title"} (goes to ${destination ?? "nowhere yet"})`
      }
      rowNotes={(row) => {
        const page = LISTING_PAGES[row.href];
        return page && counts[row.href] === 0
          ? [`${page.name} has nothing published yet, so this link goes to an empty page.`]
          : [];
      }}
    />
  );
};

export default AboutQuickLinksField;
