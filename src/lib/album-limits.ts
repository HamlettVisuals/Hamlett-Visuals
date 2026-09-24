// Limits for the Albums collection (src/collections/Events.ts).
//
// DESCRIPTION_MAX: the description is one muted line under the album title
// on its category page (components/Gallery/EventRow.tsx: 14px Inter,
// text-body, same as the category blurb on the homepage). At a 320px phone,
// the narrowest supported, the row is 280px between the page gutters, the
// same width as a homepage category tile, so it takes the same cap as the
// blurb (lib/category-limits.ts): 36 characters stay on one line. Recheck
// if the line's font or size, or the page gutter, changes.
export const DESCRIPTION_MAX = 36;
