import type { Payload } from "payload";

// The Privacy Policy and Terms & Conditions pages, each written by her in
// its own global (globals/LegalPages.ts). A page with no text yet doesn't
// exist on the site: its route 404s and the footer leaves its link out,
// like Backstage and Testimonials while they're empty (lib/listing-pages.ts).
// Publishing text brings both back by itself: every global save refreshes
// the site (lib/revalidate-site.ts). Part of payload.config.ts's module
// graph, so no "@/…" imports.

export const LEGAL_PAGES = {
  "/privacy-policy": { slug: "privacy-policy", title: "Privacy Policy" },
  "/terms": { slug: "terms", title: "Terms & Conditions" },
} as const;

export type LegalSlug = (typeof LEGAL_PAGES)[keyof typeof LEGAL_PAGES]["slug"];

type LexicalNode = { text?: unknown; children?: unknown };

/** Whether a Lexical body has any words in it (an emptied editor keeps an empty paragraph). */
export function hasText(body: unknown): boolean {
  const walk = (node: LexicalNode | null | undefined): boolean => {
    if (!node || typeof node !== "object") return false;
    if (typeof node.text === "string" && node.text.trim()) return true;
    return Array.isArray(node.children) && node.children.some(walk);
  };
  return walk((body as { root?: LexicalNode } | null | undefined)?.root);
}

// Payload stores a day-only date as that day at 12:00 UTC (lib/album-date.ts).
// "Today" is her day, not the server's (Vercel runs in UTC, which would
// already be tomorrow on a US evening).
export const LEGAL_TIME_ZONE = "America/New_York";

export function todayAsDayOnly(now = new Date(), timeZone = LEGAL_TIME_ZONE): string {
  // en-CA formats as YYYY-MM-DD.
  const day = now.toLocaleDateString("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return `${day}T12:00:00.000Z`;
}

// The body as text that doesn't depend on key order, so the same content
// sent back by the editor in a different order doesn't count as a change.
const canonical = (value: unknown): string =>
  JSON.stringify(value ?? null, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

const sameDay = (a: unknown, b: unknown) => {
  const day = (value: unknown) => (typeof value === "string" && value ? value.slice(0, 10) : null);
  return day(a) === day(b);
};

/**
 * "Last updated" on save: today when the text changed, unless she changed
 * the date herself in the same save, which is kept as she set it.
 */
export function stampLastUpdated<T extends { body?: unknown; lastUpdated?: string | null }>(
  data: T,
  originalDoc: { body?: unknown; lastUpdated?: string | null } | undefined,
  now = new Date(),
): T {
  // A save that doesn't send the body (an API update of the title only) leaves the date alone.
  if (!("body" in data)) return data;
  const bodyChanged = canonical(data.body) !== canonical(originalDoc?.body);
  const dateTouched = "lastUpdated" in data && !sameDay(data.lastUpdated, originalDoc?.lastUpdated);
  if (!bodyChanged || dateTouched) return data;
  return { ...data, lastUpdated: todayAsDayOnly(now) };
}

/** "October 8, 2026" for a stored day-only date, or null. */
export function formatLastUpdated(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** The legal pages with no text yet, by href (left out of the footer). */
export async function emptyLegalPages(payload: Payload): Promise<string[]> {
  const pages = await Promise.all(
    Object.entries(LEGAL_PAGES).map(async ([href, { slug }]) => {
      const doc = await payload.findGlobal({ slug, depth: 0 });
      return hasText(doc.body) ? null : href;
    }),
  );
  return pages.filter((href): href is string => href !== null);
}
