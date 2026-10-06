// Limits and fixed shapes for the Instagram Section global
// (src/globals/InstagramSection.ts), used by the field config, its live
// counter and the homepage (components/home/Instagram.tsx).
//   - HEADING_MAX: same cap and reasoning as the other section headings in
//     this style (see testimonials-teaser-limits.ts).
//   - LABEL_MAX: the label above an account's block when both accounts are
//     shown ("Weddings"); kept short so it stays on one line next to the
//     "Follow @handle" link at half width.
//   - FEATURED_MAX: one account's full grid (3×3). With both accounts shown
//     each block has 6 tiles, so only the first 6 picks are used then.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only (here: none) — see the note at the top of that file.
export const HEADING_MAX = 20;
export const LABEL_MAX = 20;
export const FEATURED_MAX = 9;

// Always exactly two account slots, in this order. Slot 1 is
// @hamlettvisuals; slot 2 is empty until she connects a second account.
export const INSTAGRAM_SLOTS = [1, 2] as const;
export type InstagramSlot = (typeof INSTAGRAM_SLOTS)[number];
