import type { CSSProperties } from "react";
import { Fraunces, Literata, Lora, Merriweather, Petrona } from "next/font/google";

// The curated fonts the testimonial quotes on /testimonials can be set in —
// the one place the site allows a third typeface, and italics (DESIGN.md,
// Typography). Each is a soft, readable italic at text-title size that sits
// between Fraunces headings and Inter body text without being a script,
// plus the site's own upright Fraunces. /testimonials and the homepage
// Testimonials Section each pick one by key.
// `label` is the name a future admin dropdown will show.
//
// Every font here is declared with `preload: false`. next/font preloads by
// the route that imports a font, not by whether it's used, so with the
// default every registry font would be preloaded on /testimonials. With it
// off, each font only adds a few hundred bytes of @font-face CSS, and the
// browser downloads a file only when text on the page uses it: just the
// selected font. (A runtime choice can't be preloaded by next/font anyway;
// its preload list is fixed at build time.)
//
// next/font only accepts literal options, so each font is its own call.

const lora = Lora({ subsets: ["latin"], style: "italic", weight: "400", display: "swap", preload: false });
const literata = Literata({ subsets: ["latin"], style: "italic", axes: ["opsz"], display: "swap", preload: false });
const frauncesSoft = Fraunces({
  subsets: ["latin"],
  style: "italic",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
  preload: false,
});
const merriweather = Merriweather({ subsets: ["latin"], style: "italic", axes: ["opsz"], display: "swap", preload: false });
const petrona = Petrona({ subsets: ["latin"], style: "italic", weight: "400", display: "swap", preload: false });

type QuoteFont = {
  /** Name for the admin dropdown. */
  label: string;
  /** The next/font definition (or, for a site-wide font, its utility class). */
  font: { className: string };
  weight: number;
  style: "italic" | "normal";
  /** CSS font-variation-settings for axes beyond weight, if any. */
  variationSettings?: string;
};

export const QUOTE_FONTS = {
  lora: { label: "Lora", font: lora, weight: 400, style: "italic" },
  literata: { label: "Literata", font: literata, weight: 400, style: "italic" },
  "fraunces-soft": {
    label: "Fraunces Soft",
    font: frauncesSoft,
    weight: 300,
    style: "italic",
    variationSettings: '"SOFT" 100, "WONK" 0',
  },
  // Light, with a large x-height and open, rounded italics: the softest
  // of the set at 20px, and very easy to read over several lines.
  merriweather: { label: "Merriweather Light", font: merriweather, weight: 300, style: "italic" },
  // A warm, low-contrast text italic with gentle curves; quieter than Lora,
  // closer in colour to Inter.
  petrona: { label: "Petrona", font: petrona, weight: 400, style: "italic" },
  // The homepage Testimonials Section's single-quote look: the site's own
  // Fraunces (font-display, loaded once in the root layout, opsz tracking the
  // size via font-optical-sizing: auto), upright 400. No next/font call, so
  // no second copy of Fraunces.
  "fraunces-upright": {
    label: "Fraunces (upright)",
    font: { className: "font-display" },
    weight: 400,
    style: "normal",
  },
} satisfies Record<string, QuoteFont>;

export type QuoteFontKey = keyof typeof QUOTE_FONTS;

/** Size, line-height and measure for a quote, whatever its font. */
export const QUOTE_CLASS = "max-w-measure text-title leading-[1.5] text-ink";

/** The fallback when no font is chosen (and, later, when a saved choice is no longer in the registry). */
export const DEFAULT_QUOTE_FONT: QuoteFontKey = "lora";

/** className + style to put on a quote set in this font. */
export function quoteFontProps(key: QuoteFontKey): { className: string; style: CSSProperties } {
  const { font, weight, style, ...rest } = QUOTE_FONTS[key];
  const variationSettings = "variationSettings" in rest ? rest.variationSettings : undefined;
  return {
    className: font.className,
    style: { fontWeight: weight, fontStyle: style, fontVariationSettings: variationSettings },
  };
}
