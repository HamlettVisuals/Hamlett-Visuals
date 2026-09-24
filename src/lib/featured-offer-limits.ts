// Limits for the Featured Offer global (src/globals/FeaturedOffer.ts), used
// by the field config (and its live counter). Measured on the real section
// (components/home/FeaturedOffer.tsx) at a 320px phone — the narrowest
// supported:
//   - HEADING_MAX: the section heading (Fraunces 500, --text-heading, 24px
//     there) has 261px between the page gutters. Realistic 20-character
//     headings run 202–244px ("Popular right now" 202, "Wedding Wonderland"
//     244); at 22 ("Most Popular Package!!", 264px) it wraps. All caps wraps
//     from ~17 characters at any cap, so it isn't covered. Same cap as the
//     Categories Intro heading, which uses the same style.
//   - BADGE_TEXT_MAX: the badge (small caps, 13px, never wraps) sits inside
//     the card's 24px padding, leaving 213px. Word labels reach 200px at 28
//     characters and overflow at 29; 24 (~175px) leaves room for wide
//     letters. Small caps make all caps no wider.
// Recheck if the heading's or badge's font, size or the card padding change.
export const HEADING_MAX = 20;
export const BADGE_TEXT_MAX = 24;
