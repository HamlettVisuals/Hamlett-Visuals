// Where synced Instagram posts come from. The sync (lib/instagram-sync.ts)
// only ever talks to an InstagramProvider: the mock provider in local dev
// (lib/instagram-mock-provider.ts) or the real Instagram API with Facebook
// Login (lib/instagram-real-provider.ts), without touching the sync, the
// studio or the homepage.
//
// No imports, so unit tests can load it directly.

export type MediaType = "image" | "video" | "carousel";

export type ProviderMedia = {
  // Instagram's id for the post; the sync matches saved posts on it.
  igId: string;
  mediaType: MediaType;
  permalink: string | null;
  caption: string;
  // ISO timestamp.
  postedAt: string;
  // For a video, its cover frame; for a carousel, its first item. Instagram's
  // links to these expire, so the sync copies the image into R2 right away.
  imageUrl: string;
};

export type ProviderAccount = { igUserId: string; username: string };

type Failure = {
  ok: false;
  // not_configured: nothing to talk to yet (no app credentials, no token).
  // auth: Instagram refused the token; she has to reconnect.
  // error: anything else (network, Instagram down); the next sync retries.
  reason: "not_configured" | "auth" | "error";
  message: string;
};

export type FetchMediaResult = { ok: true; account: ProviderAccount; media: ProviderMedia[] } | Failure;
// expiresAt null: the token has no expiry date (a Facebook Page token).
export type RefreshTokenResult = { ok: true; accessToken: string; expiresAt: string | null } | Failure;
export type DownloadedImage = { data: Buffer; mimeType: string };
export type DownloadedVideo = { data: Buffer; mimeType: string };
// url null: Instagram gave no video link for it (it leaves media_url out
// for media with copyrighted content, e.g. licensed music), so there's
// nothing to copy and the tile keeps its cover image.
export type VideoLinkResult = { ok: true; url: string | null } | Failure;

/** A video over the size cap (lib/instagram-video-limits.ts); skipped, not retried. */
export class VideoTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoTooLargeError";
  }
}

export interface InstagramProvider {
  readonly name: "mock" | "real";
  // Posts from this provider are saved with isMock (and its connections too).
  readonly isMock: boolean;
  /** The account's most recent posts, newest first, at most `limit`. */
  fetchRecentMedia(args: { slot: number; accessToken: string | null; limit: number }): Promise<FetchMediaResult>;
  /**
   * The token to keep from now on and when it stops working: a renewed one,
   * or (for a token that can't be renewed) the same one, checked.
   */
  refreshToken(args: { accessToken: string }): Promise<RefreshTokenResult>;
  /** The bytes of a post's image (ProviderMedia.imageUrl). */
  downloadImage(media: ProviderMedia): Promise<DownloadedImage>;
  /** A fresh link to a video post's video file (links expire, so asked for right before downloading). */
  fetchVideoUrl(args: { igId: string; accessToken: string | null }): Promise<VideoLinkResult>;
  /** The video's bytes; throws VideoTooLargeError past maxBytes (before or while downloading). */
  downloadVideo(url: string, maxBytes: number): Promise<DownloadedVideo>;
}
