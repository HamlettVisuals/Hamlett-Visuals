import {
  checkToken,
  downloadMediaImage,
  downloadMediaVideo,
  fetchLinkedMedia,
  fetchVideoUrl,
  GraphError,
  metaAppFromEnv,
  type MetaApp,
} from "#src/lib/instagram-graph.ts";
import type { InstagramProvider, ProviderMedia } from "#src/lib/instagram-provider.ts";
import { VIDEO_DOWNLOAD_TIMEOUT_SECONDS } from "#src/lib/instagram-video-limits.ts";

// The real Instagram API: the Instagram API with Facebook Login
// (lib/instagram-graph.ts). Her Instagram Creator account is linked to a
// Facebook Page, and the token saved for each connection (Instagram Tokens)
// is that Page's token, from the connect flow (lib/instagram-connect.ts).
//
//   - fetchRecentMedia: the Instagram account linked to the Page, and its
//     recent posts. A token Meta refuses (or a missing permission, or the
//     account unlinked from the Page) is reason "auth": she reconnects.
//   - refreshToken: a Page token has no expiry date and can't be renewed, so
//     this checks it instead (lib/instagram-sync.ts refreshTokens, daily)
//     and reports when Meta's data access for it runs out, if ever.
//   - downloadImage: the post's image from Instagram's CDN, right after
//     fetchRecentMedia, before the signed link expires.
//   - fetchVideoUrl / downloadVideo: a video post's file, its link asked
//     for right before downloading (lib/instagram-videos.ts).
//
// Never logs or returns the token.

const NOT_CONFIGURED = {
  ok: false,
  reason: "not_configured",
  message: "The Instagram connection isn't set up yet.",
} as const;

const failure = (err: unknown) =>
  err instanceof GraphError && err.needsReconnect
    ? ({ ok: false, reason: "auth", message: `Instagram stopped accepting the connection: ${err.message}` } as const)
    : ({ ok: false, reason: "error", message: err instanceof Error ? err.message : "Instagram didn't answer." } as const);

export function createRealProvider({
  fetchFn = (...args: Parameters<typeof fetch>) => fetch(...args),
  app = metaAppFromEnv,
}: { fetchFn?: typeof fetch; app?: () => MetaApp | null } = {}): InstagramProvider {
  return {
    name: "real",
    isMock: false,
    async fetchRecentMedia({ accessToken, limit }) {
      if (!accessToken) return NOT_CONFIGURED;
      try {
        return { ok: true, ...(await fetchLinkedMedia(fetchFn, accessToken, limit)) };
      } catch (err) {
        return failure(err);
      }
    },
    async refreshToken({ accessToken }) {
      const meta = app();
      if (!meta) return NOT_CONFIGURED;
      try {
        const check = await checkToken(fetchFn, meta, accessToken);
        if (!check.valid) {
          return { ok: false, reason: "auth", message: "Instagram stopped accepting the connection. Reconnect the account." };
        }
        return { ok: true, accessToken, expiresAt: check.expiresAt };
      } catch (err) {
        return failure(err);
      }
    },
    async downloadImage(media: ProviderMedia) {
      return downloadMediaImage(fetchFn, media.imageUrl);
    },
    async fetchVideoUrl({ igId, accessToken }) {
      if (!accessToken) return NOT_CONFIGURED;
      try {
        return { ok: true, url: await fetchVideoUrl(fetchFn, accessToken, igId) };
      } catch (err) {
        return failure(err);
      }
    },
    async downloadVideo(url, maxBytes) {
      return downloadMediaVideo(fetchFn, url, { maxBytes, timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_SECONDS * 1000 });
    },
  };
}

export const realProvider = createRealProvider();
