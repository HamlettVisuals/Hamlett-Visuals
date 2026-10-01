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
import { LISTING_PAGES } from "@/lib/listing-pages";
import { stringify } from "qs-esm";

// The About global's quick links (globals/About.ts → quickLinks): the same
// compact rows as Header/Nav's menu links (LinkRowsEditor), with a small
// label and a title per link. The card's icon follows the destination on
// the site (lib/quick-link-icons.tsx), so there's nothing to pick here.
// Each column is labelled: Title (the card's small caption), Subtitle (its
// main line) and Links to.
//
// A link to Backstage or Testimonials is hidden on the site while that page
// has nothing on it (lib/listing-pages.ts, the same rule the site uses), and
// comes back by itself once it does; the link says so here meanwhile.

const TEXT_FIELDS = [
  { name: "label", label: "Title", placeholder: "e.g. Backstage", max: QUICK_LINK_LABEL_MAX },
  { name: "title", label: "Subtitle", placeholder: "e.g. Client stories", max: QUICK_LINK_TITLE_MAX },
];

function usePublishedCounts() {
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
      hrefLabel="Links to"
      maxRows={QUICK_LINKS_MAX}
      capHint={`${QUICK_LINKS_MAX} links is the most that fit beside your photo on a computer screen. Remove one to add another.`}
      summarize={(row, destination) =>
        `${row.label?.trim() || "Untitled link"} → ${row.title?.trim() || "no title"} (goes to ${destination ?? "nowhere yet"})`
      }
      rowNotes={(row) => {
        const page = LISTING_PAGES[row.href];
        return page && counts[row.href] === 0
          ? [`${page.name} has nothing published yet, so this link is hidden on your site until that page has content.`]
          : [];
      }}
    />
  );
};

export default AboutQuickLinksField;
