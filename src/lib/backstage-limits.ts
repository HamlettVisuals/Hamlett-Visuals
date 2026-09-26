// Limits for Backstage items (src/collections/Backstage.ts), enforced on
// save and shown in the editor by the live counters and help text.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only (here: upload-sizes.ts, which has none of its own) — see
// the note at the top of that file.
//
// Text, measured on the /backstage grid (components/Backstage/BackstageGrid.tsx):
//   - TITLE_MAX: the tile title is one line of 14px medium text. The tile is
//     134px wide on a 320px phone, where about 18 characters fit;
//     longer titles are cut off with "…" there but read in full from 390px
//     phones up and in the viewer.
//   - CAPTION_MAX: the tile shows two lines of the caption; the viewer shows
//     all of it under the video or photo. 150 characters stays a caption
//     rather than a paragraph.
export const TITLE_MAX = 30;
export const CAPTION_MAX = 150;

// Files. R2's free tier is 10GB of storage (plus 1M uploads and 10M reads a
// month, and no charge for bandwidth), so storage is what runs out first:
//   - VIDEO_MAX_MB: a hard stop well above the 100MB the help text asks for,
//     so one long phone clip (1080p is ~1–2MB a second) still goes through,
//     but a stray 4K recording doesn't eat a tenth of the free tier.
//   - VIDEO_MAX_SECONDS: behind-the-scenes clips are short, like Reels (up
//     to 3 minutes). Longer than that is almost always the wrong file.
// A photo item has the same cap as Photos (upload-sizes.ts).
export const VIDEO_MAX_MB = 200;
export const VIDEO_MAX_SECONDS = 180;
export { MB, PHOTO_MAX_MB } from "#src/lib/upload-sizes.ts";

// Formats browsers can play inline: MP4 and MOV from phones, WebM from some
// screen recorders. (A MOV shot as HEVC plays in Safari but not in every
// other browser; exporting at 1080p from the phone's editor gives H.264.)
export const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/x-m4v", "video/webm"];

export const isVideoMimeType = (mimeType: unknown) =>
  typeof mimeType === "string" && mimeType.startsWith("video/");

// "wedding-prep_02.mp4" -> "Wedding prep 02". Separators become spaces, the
// first letter is capitalised and everything else is left as it was (so
// "IMG_2041.MOV" stays "IMG 2041"), then it's cut at a word to fit
// TITLE_MAX.
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, "");
  const words = base.replace(/[-_.+]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "Untitled";
  let title = words.charAt(0).toUpperCase() + words.slice(1);
  if (title.length > TITLE_MAX) {
    const cut = title.slice(0, TITLE_MAX + 1);
    const lastSpace = cut.lastIndexOf(" ");
    title = (lastSpace > TITLE_MAX / 2 ? cut.slice(0, lastSpace) : cut.slice(0, TITLE_MAX)).trim();
  }
  return title;
}
