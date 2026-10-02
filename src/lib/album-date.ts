/**
 * An album's shoot date as "June 2026" (the category page's album rows, and
 * the /testimonials context line). Payload stores a day-only date as that
 * day at 12:00 UTC, so it's formatted in UTC to keep the month right in
 * every time zone.
 */
export function formatAlbumDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
