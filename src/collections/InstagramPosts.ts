import type { CollectionConfig } from "payload";
import { readRealInstagramPosts } from "#src/access/publicRead.ts";

// Her Instagram posts as last synced: one upload per post, its image copied
// into R2 (in its own `instagram` folder, not the Photos library) because
// Instagram's own image links expire. The homepage reads only these, never
// Instagram itself. Made, updated and pruned only by the sync (Phase 2)
// through the Local API, so nothing can be changed through the API.
//
// Mock posts (`isMock`, lib/instagram-connection.ts) are never readable
// signed out, and the homepage leaves them out unless mock posts are
// allowed.
//
// Not in the studio's side menu (SiteNav.tsx); picked from the Instagram
// Section's account cards.
export const InstagramPosts: CollectionConfig = {
  slug: "instagram-posts",
  labels: { singular: "Instagram Post", plural: "Instagram Posts" },
  admin: {
    hideAPIURL: true,
    useAsTitle: "igId",
    defaultColumns: ["filename", "connection", "mediaType", "postedAt"],
  },
  defaultSort: "-postedAt",
  access: {
    read: readRealInstagramPosts,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  upload: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    imageSizes: [
      // The studio's featured-posts picker (4:5, like the homepage tiles).
      { name: "thumbnail", width: 320, height: 400, fit: "cover" },
    ],
  },
  fields: [
    {
      // Instagram's own id for the post; the sync matches on it.
      name: "igId",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "connection",
      type: "relationship",
      relationTo: "instagram-connections",
      required: true,
      index: true,
    },
    {
      // A video's or reel's image is its cover frame; a carousel's is its
      // first item.
      name: "mediaType",
      type: "select",
      required: true,
      options: [
        { label: "Photo", value: "image" },
        { label: "Video", value: "video" },
        { label: "Carousel", value: "carousel" },
      ],
    },
    {
      name: "permalink",
      type: "text",
    },
    {
      // Her caption, used as the tile's alt text.
      name: "caption",
      type: "textarea",
    },
    {
      name: "postedAt",
      type: "date",
      required: true,
      index: true,
    },
    {
      name: "isMock",
      type: "checkbox",
      defaultValue: false,
      index: true,
    },
  ],
};
