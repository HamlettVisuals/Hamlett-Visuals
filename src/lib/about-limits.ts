// Limits for the About global's quick links (src/globals/About.ts), enforced
// on save by the field config and shown in the editor by
// components/admin/AboutQuickLinksField.tsx.
//
// Measured on the real section (components/home/About.tsx) with a typical
// ~110-word, three-paragraph bio beside the portrait. Cards are 64px tall
// with a 12px gap:
//   - QUICK_LINKS_MAX: at 1280px and wider, 4 cards fit under the bio
//     without running past the portrait; 1024px fits 2, 900px fits 1, and
//     at the 768px tablet layout even the current two cards run below it
//     (the portrait is only 320px tall there). With a short ~45-word bio:
//     6 / 4 / 3 / 2. On phones the portrait stacks above the text, so any
//     number fits. 4 is the most that sit beside the portrait on a desktop
//     screen with a real bio.
//   - QUICK_LINK_TITLE_MAX: the title is the card's main line (14px Inter
//     500). Its text area is 285px on tablet/desktop, 233px on a 390px phone
//     and 166px at 320px. Realistic titles stay on one line up to 32
//     characters at 390px and wider, and on two at 320px (today's "Reels &
//     behind the scenes", 25, already wraps there).
//   - QUICK_LINK_LABEL_MAX: the small-caps line above it (13px). Word
//     labels first wrap at 28 characters at 320px; 24 leaves room for wide
//     letters.
// Recheck if the card's font, padding or the About layout change.
export const QUICK_LINKS_MAX = 4;
export const QUICK_LINK_TITLE_MAX = 32;
export const QUICK_LINK_LABEL_MAX = 24;
