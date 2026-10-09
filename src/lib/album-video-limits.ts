// Limits and wording for album videos (src/collections/Videos.ts): a
// walkthrough or highlight reel for one shoot, shown above the album's
// photos on its category page. Checked in the studio before the upload
// starts (components/admin/AlbumVideos) and again on save, where the file
// itself is read (lib/album-video-media.ts).
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only (here: upload-sizes.ts, which has none of its own) — see the
// note at the top of that file.
//
//   - ALBUM_VIDEO_MAX_MB: her web export (1080p H.264 at 12–16 Mbps) is
//     90–120MB a minute, so a 5-minute reel is well under 1GB. Bigger is
//     almost always a camera original rather than an export.
//   - ALBUM_VIDEO_MAX_SECONDS: reels are 30 seconds to 5 minutes; 10 leaves
//     room without letting a whole ceremony through.
//   - Only MP4 with H.264 video: the one format every browser plays. Phones
//     and editors often default to HEVC or .mov, so the refusals say how to
//     export instead (EXPORT_HINT).
export { MB } from "#src/lib/upload-sizes.ts";

export const ALBUM_VIDEO_MAX_MB = 1024;
export const ALBUM_VIDEO_MAX_SECONDS = 600;
export const ALBUM_VIDEO_MIME_TYPE = "video/mp4";

export const EXPORT_HINT = "Export it as an H.264 MP4 using your website preset, then upload the new file.";

/** The studio's help text, above the album's videos. */
export const EXPORT_ADVICE =
  "Use your website export preset: 1080p, H.264 MP4, about 12–16 Mbps, with fast start on. It starts quickly and plays smoothly on phones. Up to 1GB and 10 minutes.";

/** Shown on a saved video whose file doesn't start playing straight away. */
export const SLOW_START_ADVICE =
  "This file isn't set up for fast start, so it can take a few seconds to begin playing, longest on phones. Re-export it with your website preset (fast start on) and upload it again.";

/** "1.3GB", "740MB". */
export function formatVideoSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${Math.ceil(gb * 10) / 10}GB`;
  return `${Math.ceil(bytes / (1024 * 1024))}MB`;
}

/** "4:05", "12:00". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// The refusals, shared by the studio's check before upload and the save.
// No colons or commas: Payload's error toast reads "message: a, b" as a
// list of fields (see lib/upload-limits.ts).
export const refusals = {
  notMp4: (name: string) =>
    /\.(mov|qt)$/i.test(name)
      ? `That's a .mov file. ${EXPORT_HINT}`
      : `That isn't an MP4 video. ${EXPORT_HINT}`,
  quickTime: () => `That file is a QuickTime movie renamed to .mp4. ${EXPORT_HINT}`,
  tooBig: (bytes: number) =>
    `That video is ${formatVideoSize(bytes)}. Videos can be up to 1GB. Your website preset keeps a 5-minute reel well under that.`,
  tooLong: (seconds: number) =>
    `That video is ${formatDuration(seconds)} long. Videos can be up to ${ALBUM_VIDEO_MAX_SECONDS / 60} minutes.`,
  wrongCodec: (codec: string) =>
    codec === "hevc"
      ? `That video is HEVC (H.265) which many browsers can't play. ${EXPORT_HINT}`
      : `That video is ${codec.toUpperCase()} which not every browser can play. ${EXPORT_HINT}`,
  unreadable: () => `That file couldn't be read as a video. ${EXPORT_HINT}`,
};
