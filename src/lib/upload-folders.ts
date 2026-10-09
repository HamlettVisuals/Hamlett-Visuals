// Each upload collection keeps its files in its own folder of the R2
// bucket (`prefix` in payload.config.ts), so two collections can have a
// file of the same name without one overwriting the other. Payload only
// keeps names unique within a collection.
//
// No imports: next.config.ts reads it too (a file's URL carries its folder
// as `?prefix=`, which next/image has to be told about), and it's part of
// payload.config.ts's module graph — see the note at the top of that file.
export const UPLOAD_FOLDERS = {
  photos: "photos",
  logos: "logos",
  "testimonial-photos": "testimonial-photos",
  backstage: "backstage",
  "backstage-thumbnails": "backstage-thumbnails",
  "instagram-posts": "instagram",
  "instagram-videos": "instagram-videos",
  videos: "videos",
  "video-posters": "video-posters",
} as const;
