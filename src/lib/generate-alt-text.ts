// Auto-generated, SEO-oriented alt text — no photographer input required.
// Every photo on the site gets its alt text composed here from whatever
// category/event metadata is already available, so nothing ships with a
// missing or empty alt attribute.

export const STUDIO_NAME = "Hamlett Visuals";

// We don't have a real per-photo location field yet — every event uses this
// single constant until one exists. Change it here and every alt on the site
// follows.
export const DEFAULT_LOCATION = "Northern NJ";

const FALLBACK_ALT = `Photography by ${STUDIO_NAME}`;

type AltTextInput =
  // Category tile, and the homepage hero rotation (same pattern).
  | { kind: "category"; category: string }
  // A photo inside a specific event/album — gallery grid and lightbox views.
  | { kind: "event"; category: string; eventName?: string; location?: string }
  // A testimonial's session photo.
  | { kind: "testimonial"; category: string; eventName?: string };

/** Composes SEO-oriented alt text from available photo/category/event metadata. */
export function generateAltText(input: AltTextInput): string {
  switch (input.kind) {
    case "category":
      return `${input.category} photography by ${STUDIO_NAME}`;

    case "event": {
      if (!input.eventName) return FALLBACK_ALT;
      const base = `${input.eventName} ${input.category.toLowerCase()} photography`;
      return input.location ? `${base} — ${input.location}` : base;
    }

    case "testimonial": {
      if (!input.eventName) return FALLBACK_ALT;
      return `${input.eventName} ${input.category.toLowerCase()} photography — ${STUDIO_NAME}`;
    }
  }
}
