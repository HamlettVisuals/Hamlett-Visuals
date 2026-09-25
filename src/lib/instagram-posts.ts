// Data-layer seam for the homepage Instagram section (same pattern as
// lib/inquiries.ts and lib/site-settings.ts): a manually curated list stands
// in until there's a real Instagram Graph API sync. When that sync exists,
// add a fetchInstagramPosts() here that returns recent posts in this same
// shape, and merge its result with the manually pinned posts below through
// selectFeaturedPosts() — the ordering logic doesn't change, only where "the
// rest" of the posts come from.

export type InstagramPost = {
  id: string;
  imageUrl: string;
  caption: string;
  // The post's own link; null (the placeholders below) links to her
  // profile, made from the Instagram username in Site Settings.
  permalink: string | null;
  // Pins a post to the front of selectFeaturedPosts(), ahead of whatever
  // "the rest" resolves to. Unused today (every post below is unpinned) but
  // present so pinning becomes a data change later, not a code change.
  pinned: boolean;
};

export const instagramPosts: InstagramPost[] = [
  {
    id: "1",
    imageUrl: "/instagram/post-1.svg",
    caption: "Golden-hour first dance, riverside barn",
    permalink: null,
    pinned: false,
  },
  {
    id: "2",
    imageUrl: "/instagram/post-2.svg",
    caption: "Portrait in soft window light",
    permalink: null,
    pinned: false,
  },
  {
    id: "3",
    imageUrl: "/instagram/post-3.svg",
    caption: "Pit lane, round four",
    permalink: null,
    pinned: false,
  },
  {
    id: "4",
    imageUrl: "/instagram/post-4.svg",
    caption: "Mid-stride across an open field",
    permalink: null,
    pinned: false,
  },
  {
    id: "5",
    imageUrl: "/instagram/post-5.svg",
    caption: "Studio set for a coffee roaster",
    permalink: null,
    pinned: false,
  },
  {
    id: "6",
    imageUrl: "/instagram/post-6.svg",
    caption: "Twilight exterior, listing shoot",
    permalink: null,
    pinned: false,
  },
];

/**
 * Picks `count` posts for display: pinned posts first (in array order), then
 * the remaining posts in order until `count` is filled. Call this instead of
 * slicing `posts` directly — once "the rest" is recent posts fetched from the
 * API rather than hardcoded entries, this function still doesn't need to
 * change.
 */
export function selectFeaturedPosts(
  posts: InstagramPost[],
  count: number,
): InstagramPost[] {
  const pinned = posts.filter((post) => post.pinned);
  const unpinned = posts.filter((post) => !post.pinned);
  return [...pinned, ...unpinned].slice(0, count);
}
