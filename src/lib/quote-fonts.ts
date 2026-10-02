import type { CSSProperties } from "react";
import { QUOTE_FONT_OPTIONS, type QuoteFontKey } from "@/lib/quote-font-options";
import { Fraunces, Literata, Lora, Merriweather, Petrona } from "next/font/google";

// The curated fonts the testimonial quotes on /testimonials can be set in —
// the one place the site allows a third typeface, and italics (DESIGN.md,
// Typography). Each is a soft, readable italic at text-title size that sits
// between Fraunces headings and Inter body text without being a script,
// plus the site's own upright Fraunces. /testimonials and the homepage
// Testimonials Section each pick one by key.
// The keys and the names the admin dropdowns show are in
// lib/quote-font-options.ts, which Payload's config can import.
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
  /** The next/font definition (or, for a site-wide font, its utility class). */
  font: { className: string };
  weight: number;
  style: "italic" | "normal";
  /** CSS font-variation-settings for axes beyond weight, if any. */
  variationSettings?: string;
};

export const QUOTE_FONTS = {
  lora: { font: lora, weight: 400, style: "italic" },
  literata: { font: literata, weight: 400, style: "italic" },
  "fraunces-soft": {
    font: frauncesSoft,
    weight: 300,
    style: "italic",
    variationSettings: '"SOFT" 100, "WONK" 0',
  },
  // Light, with a large x-height and open, rounded italics: the softest
  // of the set at 20px, and very easy to read over several lines.
  merriweather: { font: merriweather, weight: 300, style: "italic" },
  // A warm, low-contrast text italic with gentle curves; quieter than Lora,
  // closer in colour to Inter.
  petrona: { font: petrona, weight: 400, style: "italic" },
  // The homepage Testimonials Section's single-quote look: the site's own
  // Fraunces (font-display, loaded once in the root layout, opsz tracking the
  // size via font-optical-sizing: auto), upright 400. No next/font call, so
  // no second copy of Fraunces.
  "fraunces-upright": {
    font: { className: "font-display" },
    weight: 400,
    style: "normal",
  },
} satisfies Record<QuoteFontKey, QuoteFont>;

export type { QuoteFontKey };

/** Its name in the admin dropdowns (lib/quote-font-options.ts). */
export const quoteFontLabel = (key: QuoteFontKey) =>
  QUOTE_FONT_OPTIONS.find((option) => option.key === key)?.label ?? key;

/** Size, line-height and measure for a quote, whatever its font. */
export const QUOTE_CLASS = "max-w-measure text-title leading-[1.5] text-ink";

/** className + style to put on a quote set in this font. */
export function quoteFontProps(key: QuoteFontKey): { className: string; style: CSSProperties } {
  const { font, weight, style, ...rest } = QUOTE_FONTS[key];
  const variationSettings = "variationSettings" in rest ? rest.variationSettings : undefined;
  return {
    className: font.className,
    style: { fontWeight: weight, fontStyle: style, fontVariationSettings: variationSettings },
  };
}
