// Limits for copying Instagram videos into R2 (lib/instagram-videos.ts).
//   - INSTAGRAM_VIDEO_MAX_MB: a video bigger than this is skipped (its tile
//     keeps the cover image). Checked before and while downloading.
//   - RECENT_WITH_VIDEO: besides her featured picks, each account's this
//     many most recent posts keep their video, enough to fill a 3×3 grid
//     whatever she picks or unpicks before the next sync.
//   - VIDEOS_PER_RUN / VIDEO_PHASE_SECONDS / RUN_SECONDS: one run (a sync,
//     the daily cron, one "copy videos" call, the copy after Publish)
//     downloads at most VIDEOS_PER_RUN, and starts none once its video
//     phase has run VIDEO_PHASE_SECONDS or the whole run RUN_SECONDS, well
//     inside the functions' 300s limit (maxDuration). What's left is
//     reported as pending, for the next run.
//   - VIDEO_DOWNLOAD_TIMEOUT_SECONDS: one download gives up after this.
//
// No imports, so unit tests and payload.config.ts's module graph can load it.
export const INSTAGRAM_VIDEO_MAX_MB = 100;
export const RECENT_WITH_VIDEO = 9;
export const VIDEOS_PER_RUN = 6;
export const VIDEO_PHASE_SECONDS = 120;
export const RUN_SECONDS = 200;
export const VIDEO_DOWNLOAD_TIMEOUT_SECONDS = 60;
