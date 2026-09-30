import { generateKeyBetween } from "payload/shared";

// Her manual order for albums (within a category) and photos (within an
// album): the `albumOrder` fields on Events and Photos, fractional-index
// keys (Payload's own generator, the same one behind the Categories order).
//
// Always sorted here in code, never by the database: the keys compare by
// character code (0-9 < A-Z < a-z), which a database collation may not
// follow, and an item saved by older code has no key yet and needs a
// sensible place:
//   - an album with no key counts as the newest, so it goes to the top of
//     its category (new albums go to the top), newest first among them;
//   - a photo with no key goes to the end of its album (new photos go to
//     the end), oldest first among them.
// Either gets a real key the next time it's saved (Events.ts / Photos.ts).
//
// Part of payload.config.ts's module graph (the collections import it), so
// no "@/…" imports here.

type Ordered = { albumOrder?: string | null; createdAt?: string | null; id?: number | string };

const compareKeys = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const time = (value: string | null | undefined) => (value ? Date.parse(value) || 0 : 0);

export function compareAlbums(a: Ordered, b: Ordered): number {
  if (!a.albumOrder || !b.albumOrder) {
    if (a.albumOrder) return 1;
    if (b.albumOrder) return -1;
    return time(b.createdAt) - time(a.createdAt);
  }
  return compareKeys(a.albumOrder, b.albumOrder);
}

export function comparePhotos(a: Ordered, b: Ordered): number {
  if (!a.albumOrder || !b.albumOrder) {
    if (a.albumOrder) return -1;
    if (b.albumOrder) return 1;
    return time(a.createdAt) - time(b.createdAt);
  }
  return compareKeys(a.albumOrder, b.albumOrder);
}

const presentKeys = (keys: (string | null | undefined)[]) =>
  keys.filter((key): key is string => Boolean(key)).sort(compareKeys);

/** A key before every existing one. */
export const keyAtStart = (keys: (string | null | undefined)[]) => generateKeyBetween(null, presentKeys(keys)[0] ?? null);

/** A key after every existing one. */
export const keyAtEnd = (keys: (string | null | undefined)[]) => generateKeyBetween(presentKeys(keys).at(-1) ?? null, null);
