// Shared shape for the gallery components. This is deliberately its own
// small type, not payload-types' Event/Photo directly: by the time data
// reaches these components it's already been fetched and grouped (see
// /portfolio/[category]/page.tsx), and staying decoupled from the Payload
// shape keeps the dev-only empty/loading/sparse previews (DevGalleryStateParam)
// trivial to construct without a live document id.

export type GalleryPhoto = {
  filename: string;
  url: string;
  alt?: string | null;
};

export type GalleryEvent = {
  slug: string;
  name: string;
  photos: GalleryPhoto[];
};
