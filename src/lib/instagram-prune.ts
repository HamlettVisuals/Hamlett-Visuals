// Which synced posts the sync deletes (lib/instagram-sync.ts): each account
// keeps its KEEP_PER_ACCOUNT most recent posts plus anything she's featured,
// however old. Deleting a post also removes its image from R2.
//
// No imports, so unit tests can load it directly.

export const KEEP_PER_ACCOUNT = 50;

type Id = number | string;

export function postsToPrune<T extends { id: Id; postedAt: string }>(
  posts: T[],
  featuredIds: Iterable<Id>,
  keep = KEEP_PER_ACCOUNT,
): Id[] {
  const featured = new Set([...featuredIds].map(String));
  return posts
    .toSorted((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(keep)
    .filter((post) => !featured.has(String(post.id)))
    .map((post) => post.id);
}
