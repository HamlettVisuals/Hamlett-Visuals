// Limits for the Categories Intro global (src/globals/CategoriesIntro.ts).
//
// HEADING_MAX: measured on the real section heading (components/home/
// Categories.tsx: Fraunces 500, --text-heading) at a 320px phone — the
// narrowest supported — where the heading is 24px and the page gutters leave
// 280px. Sentence-case text runs ~12px a character, so 20 characters is
// ~245px; heavy title case ("Browse My Work By Mo") is ~267px, still one
// line. At 21–22, wide-letter title case ("Women, Men and Mommas") reaches
// ~295–303px and wraps. All caps wraps from ~18 characters at any cap that
// allows the 18-character default, so it isn't covered. Recheck if the
// heading's font, size or the gutter changes.
export const HEADING_MAX = 20;
