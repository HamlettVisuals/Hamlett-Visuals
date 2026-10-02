// The quote-font registry's keys and labels (fonts themselves:
// lib/quote-fonts.ts). Split out because the registry calls next/font, which
// can't load inside payload.config.ts's module graph, and the admin's font
// dropdowns (Testimonials Page, Testimonials Section) need the list.
//
// Stored as plain text, not a Payload select, so adding a font later is a
// code change only (a select is a database enum, so every new font would
// need a migration). A key that isn't here any more falls back to the
// field's default (resolveQuoteFont), so a removed font never breaks a page.
//
// Part of payload.config.ts's module graph, so no "@/…" imports.

export const QUOTE_FONT_OPTIONS = [
  { key: "lora", label: "Lora" },
  { key: "literata", label: "Literata" },
  { key: "fraunces-soft", label: "Fraunces Soft" },
  { key: "merriweather", label: "Merriweather Light" },
  { key: "petrona", label: "Petrona" },
  { key: "fraunces-upright", label: "Fraunces (upright)" },
] as const;

export type QuoteFontKey = (typeof QUOTE_FONT_OPTIONS)[number]["key"];

/** /testimonials' default (Testimonials Page global). */
export const DEFAULT_TESTIMONIALS_PAGE_QUOTE_FONT: QuoteFontKey = "lora";
/** The homepage section's default (Testimonials Section global). */
export const DEFAULT_HOMEPAGE_QUOTE_FONT: QuoteFontKey = "fraunces-upright";

export const isQuoteFontKey = (value: unknown): value is QuoteFontKey =>
  QUOTE_FONT_OPTIONS.some((option) => option.key === value);

/** A saved key, or `fallback` when it's missing or no longer in the registry. */
export const resolveQuoteFont = (value: unknown, fallback: QuoteFontKey): QuoteFontKey =>
  isQuoteFontKey(value) ? value : fallback;

/** Field validation for the font dropdowns. */
export const validateQuoteFont = (value: unknown) =>
  value == null || value === "" || isQuoteFontKey(value) || "Choose one of the fonts in the list.";
