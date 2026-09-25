// Limits for the Final CTA / Footer global (src/globals/FinalCtaFooter.ts),
// used by the field config (and its live counters) and the footer links
// editor (components/admin/FooterLinksField.tsx). Measured on the real
// footer (components/Footer.tsx):
//   - CLOSING_LINE_MAX: Fraunces at 20px in a 265px column at 320px. Up to
//     ~50 characters stay within two lines; at 58 some wrap to three. 48
//     leaves room for wide letters.
//   - BUTTON_TEXT_MAX: the same button as the Booking CTA's (never wraps;
//     26 characters run ~232px of the 265px at 320px). Same cap.
//   - FOOTER_LINKS_MAX / FOOTER_LINK_LABEL_MAX: from 1024px the links sit on
//     one row (13px, 24px apart). At 1024px the row has 929px (the viewport
//     is the limit there; the container is max-w-5xl). Five 20-character
//     labels take 797–805px even in capitals; six take 961–970px and would
//     overflow (six only fit at ~16 characters). Below 1024px the links
//     stack one per line, so any count fits there.
// Recheck if the footer's fonts, spacing or container change.
export const CLOSING_LINE_MAX = 48;
export const BUTTON_TEXT_MAX = 26;
export const FOOTER_LINK_LABEL_MAX = 20;
export const FOOTER_LINKS_MAX = 5;

// The legal pages always sit in the fixed row beside the copyright line
// (components/Footer.tsx), so the editable links can't point at them.
export const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
] as const;
export const LEGAL_HREFS: string[] = LEGAL_LINKS.map((link) => link.href);
