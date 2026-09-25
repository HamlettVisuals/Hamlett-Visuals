// Limits for the Booking CTA global (src/globals/BookingCta.ts), used by the
// field config (and its live counter). Measured on the real section
// (components/home/BookingCta.tsx) in a 320px-wide page — the narrowest
// supported — where every line has 265px between the page gutters:
//   - HEADING_MAX: Fraunces 500 at 24px there. Realistic 20-character
//     headings run 204–243px ("Let's make memories!" 243); from 23 some wrap
//     ("Book your session today"). Same cap as the Featured Offer and
//     Categories Intro headings, which use the same style.
//   - SUBHEADING_MAX: body text, 14px. 110 characters stay within three
//     lines even with long words; 120 reaches a fourth.
//   - BUTTON_TEXT_MAX: the button never wraps; 25–26 characters run
//     224–232px, and 30 ("Reserve your photo session now") fills all
//     265px, so 26 leaves room for wide letters.
//   - LEAD_IN_MAX: the contact line's text (13px captions) — 40 fits on
//     one line at 320px, above the contact links.
// Recheck if the section's fonts, sizes or widths change.
export const HEADING_MAX = 20;
export const SUBHEADING_MAX = 110;
export const BUTTON_TEXT_MAX = 26;
export const LEAD_IN_MAX = 40;
