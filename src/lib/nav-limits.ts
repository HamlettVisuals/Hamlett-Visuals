// Limits for the Header/Nav global (src/globals/HeaderNav.ts), enforced on
// save by the field config and shown in the editor by
// components/admin/NavLinksField.tsx.
//
// Measured on the real header (components/Nav.tsx) at 1024px — the
// narrowest width that shows the desktop link row (`--breakpoint-header`
// in app/globals.css) — with a logo at the header's 240px maximum width
// (Wordmark.tsx) and the 13px Inter link text:
//   - 7 typical one-word links (current six + "Contact") leave ~99px
//     between logo and links; an 8th crowds it to ~14px.
//   - With seven links, one label of 16 characters still leaves ~33px;
//     18 drops to ~17px and 20 to ~10px.
// Recheck these if the header's font, spacing, logo size or breakpoint
// change.
export const NAV_MAX_LINKS = 7;
export const NAV_LABEL_MAX = 16;
export const BOOK_LABEL_MAX = 16;

// The caps above hold for typical labels, but seven links all near the
// 16-character cap would still crowd the logo. This rough estimate (same
// measurements: ~6.7px per character of link text, 24px between links, 32px
// before the Book button, whose padding adds ~53px) drives a gentle warning
// in the editor rather than a block.
const CONTENT_WIDTH = 1024 - 48; // header's px-6 padding
const MAX_LOGO_WIDTH = 240;
const MIN_CLEARANCE = 24;
const PX_PER_CHAR = 6.7;

export function navLinksCrowdLogo(labels: string[], bookLabel: string): boolean {
  const linkChars = labels.reduce((sum, label) => sum + label.trim().length, 0);
  const linksWidth = linkChars * PX_PER_CHAR + 24 * Math.max(labels.length - 1, 0);
  const bookWidth = (bookLabel.trim().length || 4) * PX_PER_CHAR + 53;
  return CONTENT_WIDTH - MAX_LOGO_WIDTH - (linksWidth + 32 + bookWidth) < MIN_CLEARANCE;
}
