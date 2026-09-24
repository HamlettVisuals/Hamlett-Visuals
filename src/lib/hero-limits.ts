// Limits for the Hero global (src/globals/Hero.ts), used by the field config
// and components/home/Hero.tsx.
//
// HERO_PHOTOS_MAX: every picked photo is a full-bleed layer stacked in the
// page (only the first is preloaded, but the rest still load behind it), so
// the list is capped to keep the homepage fast.
//
// CTA_LABEL_MAX: measured on the real hero button (.btn, 14px Inter 500,
// 22px side padding). An all-caps label ("BOOK YOUR SESSION TODAY!") makes
// a ~249px button at 24 characters, and a 320px phone — the narrowest
// supported — leaves ~281px between the page gutters, so it stays on one
// line. Recheck if the button's font or padding changes.
export const HERO_PHOTOS_MAX = 8;
export const CTA_LABEL_MAX = 24;
