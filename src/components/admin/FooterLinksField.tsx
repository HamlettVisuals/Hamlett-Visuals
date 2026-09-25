"use client";

import type { ArrayFieldClientComponent } from "payload";
import LinkRowsEditor from "@/components/admin/LinkRowsEditor";
import { FOOTER_LINK_LABEL_MAX, FOOTER_LINKS_MAX, LEGAL_HREFS } from "@/lib/footer-limits";

// The footer's link list (globals/FinalCtaFooter.ts → footerNav) as the same
// compact rows as Header/Nav's menu links (LinkRowsEditor). Privacy Policy
// and Terms aren't offered: they're always in the fixed row beside the
// copyright line (components/Footer.tsx).

const TEXT_FIELDS = [{ name: "label", placeholder: "Link text", max: FOOTER_LINK_LABEL_MAX }];

// Readonly tuple → plain array for the prop.
const EXCLUDED = [...LEGAL_HREFS];

const FooterLinksField: ArrayFieldClientComponent = (props) => (
  <LinkRowsEditor
    fieldProps={props}
    title="Footer links"
    intro="The links near the bottom of every page. Drag to reorder. Privacy Policy and Terms are always shown beside the copyright line."
    textFields={TEXT_FIELDS}
    maxRows={FOOTER_LINKS_MAX}
    capHint={`${FOOTER_LINKS_MAX} links is the most that fit on one line on a laptop screen. Remove one to add another.`}
    excludeDestinations={EXCLUDED}
    summarize={(row, destination) =>
      `${row.label?.trim() || "Untitled link"} → ${destination ?? "no destination"}`
    }
  />
);

export default FooterLinksField;
