// File size caps for the studio's uploads, checked when a file is saved.
// Admin uploads go straight from the browser to R2 (clientUploads in
// payload.config.ts), and the signed upload link already stops anything
// over the global cap there (upload.limits.fileSize, Backstage's 200MB
// video cap). These are the smaller, per-collection caps on top of it.
// Backstage keeps its own, video-aware checks (backstage-limits.ts).
//
// No imports, so the public testimonial form (client side) and
// backstage-limits.ts can use it too; part of payload.config.ts's module
// graph, see the note at the top of that file.
//
//   - PHOTO_MAX_MB: full-size phone and camera photos are 3–15MB; 25MB
//     leaves room for large JPEGs without letting in raw files.
//   - LOGO_MAX_MB: a logo is shown at most 160px tall (Logos.ts), so even
//     a generous PNG is well under 1MB; 5MB is a stop for the wrong file.
//   - PUBLIC_PHOTO_MAX_MB: a photo a client adds on the public testimonial
//     form (testimonial-uploads.ts). Phone photos, HEIC included, fit.
export const PHOTO_MAX_MB = 25;
export const LOGO_MAX_MB = 5;
export const PUBLIC_PHOTO_MAX_MB = 15;
export const MB = 1024 * 1024;

// "7.4MB", "32MB". One decimal under 10MB, and whenever rounding would
// make an over-the-limit file read as exactly the limit.
export function formatMB(bytes: number, limitMB?: number): string {
  const mb = bytes / MB;
  const whole = Math.round(mb);
  if (mb < 10 || (limitMB !== undefined && whole <= limitMB)) return `${Math.ceil(mb * 10) / 10}MB`;
  return `${whole}MB`;
}
