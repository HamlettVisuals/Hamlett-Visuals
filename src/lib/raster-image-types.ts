// The image formats Photos and Testimonial Photos accept — Payload's
// `image/*` minus SVG. SVGs can carry scripts and are served from this
// site's own origin (the /hv-studio/api file route), and Payload's built-in
// SVG check is a pattern denylist rather than a real sanitizer, so they're
// kept out entirely rather than sanitized. Shared by both collections
// because a testimonial photo a client sent gets copied into Photos when
// she uses it (lib/promote-testimonial-photo.ts), so anything the first
// accepts the second must too. Logos.ts has its own, narrower PNG/WebP list.
export const RASTER_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
];
