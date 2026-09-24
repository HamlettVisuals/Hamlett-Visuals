// Limits for the Categories collection (src/collections/Categories.ts).
//
// BLURB_MAX: measured on the real tile caption under each category photo on
// the homepage (components/home/Categories.tsx: 14px Inter, text-body) at a
// 320px phone, the narrowest supported, where the one-column tile leaves
// 280px between the page gutters. Realistic 36-character blurbs measure
// 259–272px ("Modern wedding and elopement coverag…" is the widest), so they
// stay on one line; at 38, wide-letter lines reach ~285–290px and wrap. A
// line packed with capitals ("Weddings, Mothers, Women and Mummies",
// 284px) can still wrap at 36. Recheck if the caption's font or size, or the
// page gutter, changes.
export const BLURB_MAX = 36;
