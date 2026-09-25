// Limits for the Testimonials Teaser global (src/globals/TestimonialsTeaser.ts),
// used by the field config (and its live counter). Measured on the real
// heading row (components/home/Testimonials.tsx) in a 320px-wide page — the
// narrowest supported — where the row has 265px between the page gutters:
//   - HEADING_MAX: Fraunces 500 at 24px. 18–19 characters run 214–227px
//     ("Love notes from you" 227); 22 reaches 260px. Same cap as the other
//     section headings in this style.
//   - LINK_TEXT_MAX: 14px body text. At 320px the link wraps onto its own
//     line under the heading; 25–29 characters run 177–205px, so 30 stays on
//     one line even with wide letters.
// Recheck if the heading row's fonts, sizes or widths change.
export const HEADING_MAX = 20;
export const LINK_TEXT_MAX = 30;
