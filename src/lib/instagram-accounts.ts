import { INSTAGRAM_SLOTS, type InstagramSlot } from "#src/lib/instagram-limits.ts";

// The Instagram Section's `accounts` array is always exactly two rows, slot 1
// then slot 2 (lib/instagram-limits.ts). Whatever is saved — a row removed,
// the two swapped, a third added through the API — is put back into that
// shape before it's stored, and the homepage and studio read it through the
// same function, so nothing downstream ever has to cope with a missing slot.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only — see the note at the top of that file.

export type AccountRow = {
  id?: string | null;
  slot?: number | null;
  handle?: string | null;
  label?: string | null;
  visible?: boolean | null;
  featured?: unknown[] | null;
};

export const DEFAULT_ACCOUNTS: (AccountRow & { slot: InstagramSlot })[] = [
  { slot: 1, handle: "@hamlettvisuals", label: "", visible: true, featured: [] },
  { slot: 2, handle: "", label: "", visible: false, featured: [] },
];

export function normalizeAccounts<T extends AccountRow>(rows: T[] | null | undefined): (T & { slot: InstagramSlot })[] {
  const list = Array.isArray(rows) ? rows : [];
  return INSTAGRAM_SLOTS.map((slot, i) => {
    // A row's slot, else its position (rows saved before `slot` existed).
    const row = list.find((r) => r?.slot === slot) ?? list.find((r, j) => r?.slot == null && j === i);
    const fallback = DEFAULT_ACCOUNTS[i] as T;
    return { ...fallback, ...row, slot };
  });
}
