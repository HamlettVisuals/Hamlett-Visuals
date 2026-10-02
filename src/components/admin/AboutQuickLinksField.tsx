"use client";

import type { ArrayFieldClientComponent } from "payload";
import {
  QUICK_LINK_LABEL_MAX,
  QUICK_LINK_TITLE_MAX,
  QUICK_LINKS_MAX,
} from "@/lib/about-limits";
import LinkRowsEditor from "@/components/admin/LinkRowsEditor";
import { useEmptyListingNotes } from "@/components/admin/useEmptyListingNotes";

// The About global's quick links (globals/About.ts → quickLinks): the same
// compact rows as Header/Nav's menu links (LinkRowsEditor), with a small
// label and a title per link. The card's icon follows the destination on
// the site (lib/quick-link-icons.tsx), so there's nothing to pick here.
// Each column is labelled: Title (the card's small caption), Subtitle (its
// main line) and Links to.
//
// A link to Backstage or Testimonials is hidden on the site while that page
// has nothing on it (lib/listing-pages.ts, the same rule the site uses), and
// comes back by itself once it does; the link says so here meanwhile
// (useEmptyListingNotes, shared with the footer links).

const TEXT_FIELDS = [
  { name: "label", label: "Title", placeholder: "e.g. Backstage", max: QUICK_LINK_LABEL_MAX },
  { name: "title", label: "Subtitle", placeholder: "e.g. Client stories", max: QUICK_LINK_TITLE_MAX },
];

const AboutQuickLinksField: ArrayFieldClientComponent = (props) => {
  const emptyPageNotes = useEmptyListingNotes();

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
      rowNotes={emptyPageNotes}
    />
  );
};

export default AboutQuickLinksField;
