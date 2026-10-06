// Which posts the homepage Instagram section shows, and how
// (components/home/Instagram.tsx). Pure, no imports, so unit tests load it
// directly and the studio's picker (components/admin/Instagram) shares the
// counts.
//
//   - An account is shown when it's connected, switched on (Visible) and
//     has at least one post to show.
//   - One account shown: a 3×3 grid of SINGLE_ACCOUNT_POSTS.
//   - Both shown: two labelled 3×2 blocks of BOTH_ACCOUNTS_POSTS each.
//   - None: no grid; the section falls back to its heading and a Follow
//     link (or is left out entirely when switched off).
//   - Each account's posts: her featured picks first, in her order, then
//     its most recent posts not already picked, up to the count.

export const SINGLE_ACCOUNT_POSTS = 9;
export const BOTH_ACCOUNTS_POSTS = 6;

type WithId = { id: number | string };

export function selectPosts<T extends WithId>(featured: T[], recent: T[], count: number): T[] {
  const picked: T[] = [];
  const seen = new Set<string>();
  for (const post of [...featured, ...recent]) {
    if (picked.length >= count) break;
    const key = String(post.id);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(post);
  }
  return picked;
}

export type LayoutAccount<T extends WithId> = {
  slot: number;
  handle: string | null;
  label: string | null;
  connected: boolean;
  visible: boolean;
  featured: T[];
  recent: T[];
};

export type LayoutBlock<T extends WithId> = { slot: number; handle: string | null; label: string | null; posts: T[] };

export type InstagramLayout<T extends WithId> =
  | { kind: "none" }
  | { kind: "single"; block: LayoutBlock<T> }
  | { kind: "pair"; blocks: [LayoutBlock<T>, LayoutBlock<T>] };

export function layoutFor<T extends WithId>(accounts: LayoutAccount<T>[]): InstagramLayout<T> {
  const shown = accounts
    .filter((account) => account.connected && account.visible && account.featured.length + account.recent.length > 0)
    .toSorted((a, b) => a.slot - b.slot);
  const block = (account: LayoutAccount<T>, count: number): LayoutBlock<T> => ({
    slot: account.slot,
    handle: account.handle,
    label: account.label,
    posts: selectPosts(account.featured, account.recent, count),
  });
  if (shown.length >= 2) {
    return { kind: "pair", blocks: [block(shown[0], BOTH_ACCOUNTS_POSTS), block(shown[1], BOTH_ACCOUNTS_POSTS)] };
  }
  if (shown.length === 1) return { kind: "single", block: block(shown[0], SINGLE_ACCOUNT_POSTS) };
  return { kind: "none" };
}
