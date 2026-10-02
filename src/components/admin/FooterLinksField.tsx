"use client";

import type { ArrayFieldClientComponent } from "payload";
import LinkRowsEditor from "@/components/admin/LinkRowsEditor";
import { useEmptyListingNotes } from "@/components/admin/useEmptyListingNotes";
import { FOOTER_LINK_LABEL_MAX, FOOTER_LINKS_MAX, LEGAL_HREFS } from "@/lib/footer-limits";

// The footer's link list (globals/FinalCtaFooter.ts → footerNav) as the same
// compact rows as Header/Nav's menu links (LinkRowsEditor). Privacy Policy
// and Terms aren't offered: they're always in the fixed row beside the
// copyright line (components/Footer.tsx). Columns are labelled like About's
// quick links, and a link to Backstage or Testimonials gets the same note
// while that page is empty (the site hides it meanwhile, lib/listing-pages.ts).

const TEXT_FIELDS = [{ name: "label", label: "Label", placeholder: "Link text", max: FOOTER_LINK_LABEL_MAX }];

// Readonly tuple → plain array for the prop.
const EXCLUDED = [...LEGAL_HREFS];

const FooterLinksField: ArrayFieldClientComponent = (props) => {
  const emptyPageNotes = useEmptyListingNotes();

  return (
    <LinkRowsEditor
      fieldProps={props}
      title="Footer links"
      intro="The links near the bottom of every page. Drag to reorder. Privacy Policy and Terms are always shown beside the copyright line."
      textFields={TEXT_FIELDS}
      hrefLabel="Links to"
      maxRows={FOOTER_LINKS_MAX}
      capHint={`${FOOTER_LINKS_MAX} links is the most that fit on one line on a laptop screen. Remove one to add another.`}
      excludeDestinations={EXCLUDED}
      summarize={(row, destination) =>
        `${row.label?.trim() || "Untitled link"} → ${destination ?? "no destination"}`
      }
      rowNotes={emptyPageNotes}
    />
  );
};

export default FooterLinksField;
