// Limits for the Albums collection (src/collections/Events.ts).
//
// DESCRIPTION_MAX: the description is up to two muted lines under the album
// title on its category page (components/Gallery/EventRow.tsx: 14px Inter,
// text-body, line-height 1.6). Measured on that real line at a 320px phone,
// the narrowest supported, where the row is 280px between the page
// gutters: ten realistic descriptions first wrapped to a third line at
// 71–83 characters (the earliest, "Modern wedding and elopement coverage
// across the Scottish Highlands, fro…", at 71), so 70 keeps every one of
// them on two lines. A line packed with capitals or wide letters can still
// reach three. Recheck if the line's font or size, or the page gutter,
// changes.
export const DESCRIPTION_MAX = 70;
