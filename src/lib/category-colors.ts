// Deterministic category -> color mapping, shared by every admin view that
// needs to color-code categories (the kanban board now; the calendar and
// mobile views in later phases). Categories don't carry a color field of
// their own — hashing the category's id means a given category always
// renders the same color without a stored field or a name->color map that
// would need updating every time a category is added or renamed.

export type CategoryColor = {
  /** Solid, mid-tone hue — for borders, dots, and other small accents. */
  solid: string;
  /** The same hue as a translucent fill — for tinted pill/chip backgrounds. */
  tint: string;
};

// 8 hues spaced around the wheel, each chosen at a lightness/saturation that
// stays legible as a small accent (border, dot) against both the light and
// dark admin themes — never used as a large fill or as text color, so exact
// contrast ratios against theme text aren't a concern.
const PALETTE: readonly string[] = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getCategoryColor(categoryIdOrSlug: number | string): CategoryColor {
  const solid = PALETTE[hashString(String(categoryIdOrSlug)) % PALETTE.length];
  return { solid, tint: `${solid}26` }; // hex + alpha suffix ≈ 15% opacity
}
