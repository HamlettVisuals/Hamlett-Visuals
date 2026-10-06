// The booking form's "Preferred time" choices, stored on the Inquiry as
// `preferredTime` (Inquiries.ts) and shown on the kanban card and drawer.
// One list for the form, the field and the studio. Part of payload.config.ts's
// module graph, so no "@/…" imports.

export const PREFERRED_TIMES = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
] as const;

export type PreferredTime = (typeof PREFERRED_TIMES)[number]["value"];

export const isPreferredTime = (value: unknown): value is PreferredTime =>
  PREFERRED_TIMES.some((time) => time.value === value);

/** "Afternoon", or null for no preference. */
export const preferredTimeLabel = (value: unknown): string | null =>
  PREFERRED_TIMES.find((time) => time.value === value)?.label ?? null;

/** An Instagram handle as she'd want to see it: trimmed, one leading @. Null if blank. */
export function normalizeHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const handle = value.trim().replace(/^@+/, "").replace(/\s+/g, "");
  return handle ? `@${handle}` : null;
}

/** The handle's profile link. */
export const instagramProfileUrl = (handle: string) => `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
