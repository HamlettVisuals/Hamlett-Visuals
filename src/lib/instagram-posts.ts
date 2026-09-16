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
  permalink: string;
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
    permalink: "https://www.instagram.com/hamlettvisuals/",
    pinned: false,
  },
  {
    id: "2",
    imageUrl: "/instagram/post-2.svg",
    caption: "Portrait in soft window light",
    permalink: "https://www.instagram.com/hamlettvisuals/",
    pinned: false,
  },
  {
    id: "3",
    imageUrl: "/instagram/post-3.svg",
    caption: "Pit lane, round four",
    permalink: "https://www.instagram.com/hamlettvisuals/",
    pinned: false,
  },
  {
    id: "4",
    imageUrl: "/instagram/post-4.svg",
    caption: "Mid-stride across an open field",
    permalink: "https://www.instagram.com/hamlettvisuals/",
    pinned: false,
  },
  {
    id: "5",
    imageUrl: "/instagram/post-5.svg",
    caption: "Studio set for a coffee roaster",
    permalink: "https://www.instagram.com/hamlettvisuals/",
    pinned: false,
  },
  {
    id: "6",
    imageUrl: "/instagram/post-6.svg",
    caption: "Twilight exterior, listing shoot",
    permalink: "https://www.instagram.com/hamlettvisuals/",
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
