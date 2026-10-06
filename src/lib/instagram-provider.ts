// Where synced Instagram posts come from. The sync (lib/instagram-sync.ts)
// only ever talks to an InstagramProvider, so the mock provider used until
// her account is confirmed as a Professional account
// (lib/instagram-mock-provider.ts) can be swapped for the real Instagram API
// (lib/instagram-real-provider.ts) without touching the sync, the studio or
// the homepage.
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
export type RefreshTokenResult = { ok: true; accessToken: string; expiresAt: string } | Failure;
export type DownloadedImage = { data: Buffer; mimeType: string };

export interface InstagramProvider {
  readonly name: "mock" | "real";
  // Posts from this provider are saved with isMock (and its connections too).
  readonly isMock: boolean;
  /** The account's most recent posts, newest first, at most `limit`. */
  fetchRecentMedia(args: { slot: number; accessToken: string | null; limit: number }): Promise<FetchMediaResult>;
  /** A fresh long-lived token in exchange for the current one. */
  refreshToken(args: { accessToken: string }): Promise<RefreshTokenResult>;
  /** The bytes of a post's image (ProviderMedia.imageUrl). */
  downloadImage(media: ProviderMedia): Promise<DownloadedImage>;
}
