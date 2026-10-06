import type { InstagramProvider, ProviderMedia } from "@/lib/instagram-provider";

// The real Instagram API, not wired up yet: waiting on her account being
// confirmed as a Professional account. Until then every call answers "not
// configured", which the sync records without touching her posts or
// marking anything as needing a reconnect.
//
// TODO(instagram): implement with the Instagram API with Instagram Login
// (graph.instagram.com), which works for Professional (Business or Creator)
// accounts without a Facebook Page:
//   - App credentials: INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET env vars, and
//     a connect route (studio-only) that runs the OAuth flow, swaps the code
//     for a long-lived token (60 days) and saves it in Instagram Tokens
//     (collections/InstagramTokens.ts, Local API only) plus the account's id
//     and username on its Instagram Connection, with isMock false.
//   - fetchRecentMedia: GET https://graph.instagram.com/me?fields=user_id,username
//     then GET https://graph.instagram.com/me/media?fields=id,media_type,
//     media_url,thumbnail_url,permalink,caption,timestamp&limit=<limit>.
//     media_type IMAGE → "image", VIDEO (incl. reels) → "video" with
//     thumbnail_url as the image, CAROUSEL_ALBUM → "carousel" (media_url is
//     its first item). A 400 with OAuthException / code 190 means the token
//     is dead: return reason "auth".
//   - refreshToken: GET https://graph.instagram.com/refresh_access_token
//     ?grant_type=ig_refresh_token&access_token=<token>; the token must be
//     at least 24 hours old. Returns { access_token, expires_in (seconds) }.
//   - downloadImage: fetch(media.imageUrl) right after fetchRecentMedia,
//     before the signed CDN link expires.
//   - Never log or return the token.

const NOT_CONFIGURED = {
  ok: false,
  reason: "not_configured",
  message: "The Instagram connection isn't set up yet.",
} as const;

export const realProvider: InstagramProvider = {
  name: "real",
  isMock: false,
  async fetchRecentMedia() {
    return NOT_CONFIGURED;
  },
  async refreshToken() {
    return NOT_CONFIGURED;
  },
  async downloadImage(media: ProviderMedia) {
    throw new Error(`Can't download ${media.igId}: the Instagram connection isn't set up yet.`);
  },
};
