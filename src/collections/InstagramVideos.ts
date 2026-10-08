import type { CollectionConfig } from "payload";
import { readInstagramPosts } from "#src/access/publicRead.ts";

// The video file of a synced Instagram video or reel (InstagramPosts.ts),
// copied into R2 (its own `instagram-videos` folder) because Instagram's
// video links expire. Only for the posts that can appear on the homepage:
// each account's featured picks and its most recent posts
// (lib/instagram-videos.ts); the rest have their cover image only.
//
// Played straight from R2 (Payload's file URL redirects to a short-lived
// signed link, payload.config.ts) rather than streamed through the server.
// Made and deleted only by the sync through the Local API; deleting one
// removes its file from R2, and deleting a post deletes its video
// (InstagramPosts.ts beforeDelete).
//
// Mock videos (`isMock`) are a small test clip generated locally under
// mock-… names, never a copy of anything else in the bucket, so the mock
// cleanup can't delete a real file (lib/instagram-mock-cleanup.ts).
export const InstagramVideos: CollectionConfig = {
  slug: "instagram-videos",
  labels: { singular: "Instagram Video", plural: "Instagram Videos" },
  admin: {
    hidden: true,
    hideAPIURL: true,
    useAsTitle: "filename",
  },
  access: {
    // Same as the posts: mock ones never signed out on production.
    read: readInstagramPosts,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  upload: {
    // Size: the sync skips anything over INSTAGRAM_VIDEO_MAX_MB
    // (lib/instagram-video-limits.ts) before downloading it.
    mimeTypes: ["video/mp4", "video/quicktime"],
  },
  fields: [
    {
      name: "post",
      type: "relationship",
      relationTo: "instagram-posts",
      required: true,
      unique: true,
    },
    {
      name: "isMock",
      type: "checkbox",
      defaultValue: false,
      index: true,
    },
  ],
};
