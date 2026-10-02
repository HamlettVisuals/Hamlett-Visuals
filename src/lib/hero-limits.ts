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
//
// SECONDS_PER_PHOTO_*: the "Seconds per photo" setting, in half seconds.
// The default is the hold the hero used before it was a setting (4.5s), so
// the site didn't change when it was added. The crossfade
// (--hero-fade-duration) isn't part of it.
export const HERO_PHOTOS_MAX = 8;
export const SECONDS_PER_PHOTO_MIN = 2;
export const SECONDS_PER_PHOTO_MAX = 10;
export const SECONDS_PER_PHOTO_STEP = 0.5;
export const SECONDS_PER_PHOTO_DEFAULT = 4.5;

/** The saved value as a whole number of half seconds within the range, or the default. */
export function secondsPerPhoto(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return SECONDS_PER_PHOTO_DEFAULT;
  const stepped = Math.round(value / SECONDS_PER_PHOTO_STEP) * SECONDS_PER_PHOTO_STEP;
  return Math.min(SECONDS_PER_PHOTO_MAX, Math.max(SECONDS_PER_PHOTO_MIN, stepped));
}
export const CTA_LABEL_MAX = 24;
