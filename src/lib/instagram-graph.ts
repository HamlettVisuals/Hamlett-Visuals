import { VideoTooLargeError, type MediaType, type ProviderAccount, type ProviderMedia } from "#src/lib/instagram-provider.ts";

// Every call this site makes to Meta for Instagram: the Instagram API with
// Facebook Login (graph.facebook.com). Her Instagram Creator account is
// linked to a Facebook Page; signing in with Facebook gives a user token,
// her Pages (each with its own Page token) and the Instagram account linked
// to each, and the Page token reads that account's posts.
//
// Used by the connect flow (app/api/instagram/callback, lib/instagram-connect.ts)
// and the real provider (lib/instagram-real-provider.ts). `fetch` is passed
// in and its only import is the provider module, so unit tests run it against faked
// Meta responses (tests/unit/instagram-graph.test.mts).
//
// Tokens go in query strings (Meta's documented way) and are never logged,
// returned to a browser or put in an error message.

export const GRAPH_VERSION = "v24.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Must match the app's "Valid OAuth Redirect URIs" exactly, and be the same
// in the login dialog and the code exchange.
export const META_REDIRECT_URI = "https://hamlett-visuals.vercel.app/api/instagram/callback";

// The least the Instagram API with Facebook Login needs to read her own
// posts: pages_show_list to list her Pages and the Instagram account linked
// to each, instagram_basic to read that account's profile and media.
export const META_SCOPES = ["instagram_basic", "pages_show_list"] as const;

/**
 * META_EXTRA_SCOPES (comma- or space-separated), for permissions only some
 * setups need: business_management when her Page belongs to a business
 * portfolio and Facebook shares it no other way. Anything that isn't a
 * permission name is dropped; so are the ones already asked for.
 */
export function parseExtraScopes(value: string | null | undefined): string[] {
  const names = (value ?? "").split(/[\s,]+/).filter((name) => /^[a-z_]+$/.test(name));
  return [...new Set(names)].filter((name) => !(META_SCOPES as readonly string[]).includes(name));
}

type Fetch = typeof fetch;

export type MetaApp = {
  appId: string;
  appSecret: string;
  // A Facebook Login for Business configuration (App Dashboard →
  // Facebook Login for Business → Configurations: user access token,
  // instagram_basic + pages_show_list). Optional: Meta accepts `scope` for
  // this route and its own guide uses it; only set if Meta refuses that.
  loginConfigId?: string;
  // META_EXTRA_SCOPES (parseExtraScopes), asked for on top of META_SCOPES.
  extraScopes?: string[];
};

/**
 * META_APP_ID / META_APP_SECRET (and META_LOGIN_CONFIG_ID and
 * META_EXTRA_SCOPES if set), or null where the app isn't set up (local dev).
 */
export function metaAppFromEnv(): MetaApp | null {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  const loginConfigId = process.env.META_LOGIN_CONFIG_ID?.trim();
  const extraScopes = parseExtraScopes(process.env.META_EXTRA_SCOPES);
  return {
    appId,
    appSecret,
    ...(loginConfigId ? { loginConfigId } : {}),
    ...(extraScopes.length ? { extraScopes } : {}),
  };
}

export class GraphError extends Error {
  readonly status: number;
  readonly code: number | null;
  constructor(message: string, status: number, code: number | null) {
    super(message);
    this.name = "GraphError";
    this.status = status;
    this.code = code;
  }
  /**
   * The token is dead or lacks a permission it needs (expired, password
   * changed, app removed, permission unticked): only reconnecting fixes it.
   * 190 invalid token, 102 session, 10 / 200–299 permissions.
   */
  get needsReconnect(): boolean {
    const code = this.code;
    return code === 190 || code === 102 || code === 10 || (code !== null && code >= 200 && code <= 299);
  }
}

async function graphGet<T>(fetchFn: Fetch, url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetchFn(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  } catch {
    throw new GraphError("Couldn't reach Instagram.", 0, null);
  }
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: { message?: string; code?: number } })
    | null;
  if (!res.ok || !body || body.error) {
    const code = typeof body?.error?.code === "number" ? body.error.code : null;
    // Meta's own wording, which never contains the token.
    throw new GraphError(body?.error?.message ?? `Instagram answered ${res.status}.`, res.status, code);
  }
  return body;
}

const graphUrl = (path: string, params: Record<string, string>) => `${GRAPH}${path}?${new URLSearchParams(params)}`;

// ---- signing in

// Meta's Instagram onboarding screens in the login (Business Login for
// Instagram): they help her link her Instagram account to her Page as she
// signs in, if it isn't yet.
const IG_ONBOARDING_EXTRAS = JSON.stringify({ setup: { channel: "IG_API_ONBOARDING" } });

/**
 * Facebook Login's consent screen, coming back to META_REDIRECT_URI. Asks
 * for META_SCOPES and any extra ones, or (with a login configuration set)
 * for whatever that configuration names: Meta says not to send both.
 */
export function loginDialogUrl(app: MetaApp, state: string): string {
  const params = new URLSearchParams({
    client_id: app.appId,
    redirect_uri: META_REDIRECT_URI,
    state,
    response_type: "code",
    ...(app.loginConfigId
      ? { config_id: app.loginConfigId }
      : { scope: [...META_SCOPES, ...(app.extraScopes ?? [])].join(",") }),
    extras: IG_ONBOARDING_EXTRAS,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`;
}

/**
 * The code from the callback, for a long-lived user token (about 60 days):
 * code → short-lived user token (an hour) → long-lived user token. Only
 * used to read her Pages' tokens, which don't expire; never stored.
 */
export async function exchangeCodeForUserToken(fetchFn: Fetch, app: MetaApp, code: string): Promise<string> {
  const short = await graphGet<{ access_token?: string }>(
    fetchFn,
    graphUrl("/oauth/access_token", {
      client_id: app.appId,
      client_secret: app.appSecret,
      redirect_uri: META_REDIRECT_URI,
      code,
    }),
  );
  if (!short.access_token) throw new GraphError("Instagram didn't send a token.", 200, null);
  const long = await graphGet<{ access_token?: string }>(
    fetchFn,
    graphUrl("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: app.appId,
      client_secret: app.appSecret,
      fb_exchange_token: short.access_token,
    }),
  );
  if (!long.access_token) throw new GraphError("Instagram didn't send a long-lived token.", 200, null);
  return long.access_token;
}

export type LinkedAccount = {
  pageId: string;
  pageName: string;
  // The Page token: no expiry date when it comes from a long-lived user token.
  pageToken: string;
  igUserId: string;
  username: string;
};

type PageList = {
  data?: {
    id: string;
    name?: string;
    access_token?: string;
    instagram_business_account?: { id: string; username?: string };
  }[];
  paging?: { next?: string };
};

// Plenty for one person's Pages; stops a paging loop running away.
const MAX_PAGE_LISTS = 5;

/** Every Page Facebook shared with the app, linked to Instagram or not. */
export type SharedPage = {
  pageId: string;
  pageName: string;
  pageToken: string | null;
  instagram: { igUserId: string; username: string } | null;
};

export async function listPages(fetchFn: Fetch, userToken: string): Promise<SharedPage[]> {
  const pages: SharedPage[] = [];
  let url: string | undefined = graphUrl("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account{id,username}",
    limit: "100",
    access_token: userToken,
  });
  for (let i = 0; url && i < MAX_PAGE_LISTS; i++) {
    const list: PageList = await graphGet<PageList>(fetchFn, url);
    for (const page of list.data ?? []) {
      const ig = page.instagram_business_account;
      pages.push({
        pageId: page.id,
        pageName: page.name ?? "",
        pageToken: page.access_token ?? null,
        instagram: ig?.id && ig.username ? { igUserId: ig.id, username: ig.username } : null,
      });
    }
    url = list.paging?.next;
  }
  return pages;
}

/** The Pages with an Instagram account linked (and a token to read it), one per account. */
export function linkedAccountsOf(pages: SharedPage[]): LinkedAccount[] {
  const accounts = pages.flatMap((page) =>
    page.instagram && page.pageToken
      ? [{ pageId: page.pageId, pageName: page.pageName, pageToken: page.pageToken, ...page.instagram }]
      : [],
  );
  // The same Instagram account can be linked to more than one Page.
  return accounts.filter((a, i) => accounts.findIndex((b) => b.igUserId === a.igUserId) === i);
}

/** Her Pages that have an Instagram account linked, with each Page's token. */
export async function listLinkedAccounts(fetchFn: Fetch, userToken: string): Promise<LinkedAccount[]> {
  return linkedAccountsOf(await listPages(fetchFn, userToken));
}

export type GrantedPermissions = { granted: string[]; declined: string[] };

/** What she actually allowed on Facebook's consent screen (/me/permissions). */
export async function grantedPermissions(fetchFn: Fetch, userToken: string): Promise<GrantedPermissions> {
  const { data } = await graphGet<{ data?: { permission?: string; status?: string }[] }>(
    fetchFn,
    graphUrl("/me/permissions", { access_token: userToken }),
  );
  const named = (status: string) =>
    (data ?? []).flatMap((row) => (row.status === status && row.permission ? [row.permission] : [])).sort();
  return { granted: named("granted"), declined: named("declined") };
}

// Enough to see what Facebook shared without the message running on.
const MAX_PAGES_DESCRIBED = 10;

/**
 * Why a connect found no account, in plain words for the card: which
 * permissions Facebook granted (null: couldn't tell), how many Pages it
 * shared, and for each whether it has Instagram linked. Names only, never
 * a token or an id.
 */
export function describeLogin(permissions: GrantedPermissions | null, pages: SharedPage[]): string {
  const parts: string[] = [];
  if (permissions) {
    const missing = META_SCOPES.filter((scope) => !permissions.granted.includes(scope));
    parts.push(`Facebook granted: ${permissions.granted.join(", ") || "nothing"}.`);
    if (permissions.declined.length) parts.push(`Declined: ${permissions.declined.join(", ")}.`);
    if (missing.length) parts.push(`Missing: ${missing.join(", ")}.`);
  } else {
    parts.push("Couldn't check which permissions Facebook granted.");
  }
  const described = pages.slice(0, MAX_PAGES_DESCRIBED).map((page) => {
    const name = page.pageName ? `"${page.pageName}"` : "(unnamed Page)";
    return page.instagram ? `${name} (Instagram @${page.instagram.username})` : `${name} (no Instagram account linked)`;
  });
  const more = pages.length > MAX_PAGES_DESCRIBED ? `, and ${pages.length - MAX_PAGES_DESCRIBED} more` : "";
  parts.push(
    pages.length
      ? `Pages returned: ${pages.length}: ${described.join("; ")}${more}.`
      : "Pages returned: 0 (Facebook shared no Pages with the site).",
  );
  return parts.join(" ");
}

export type AccountChoice =
  | { kind: "connect"; account: LinkedAccount }
  // Several accounts and no username on the slot: she picks.
  | { kind: "pick"; accounts: LinkedAccount[] }
  // No Page she manages has an Instagram account linked.
  | { kind: "none" }
  // The slot has a username and none of hers match it.
  | { kind: "no_match"; wanted: string; found: string[] }
  // The only match is already connected on the other slot.
  | { kind: "taken"; username: string };

const bare = (username: string | null | undefined) => (username ?? "").trim().replace(/^@/, "").toLowerCase();

/**
 * Which linked account a slot gets. With a username on the slot, the one
 * whose username matches; without one, the only account (or she picks).
 * An account already connected on the other slot is never offered again.
 */
export function chooseAccount(
  accounts: LinkedAccount[],
  { slotUsername, takenIgUserIds = [] }: { slotUsername?: string | null; takenIgUserIds?: string[] },
): AccountChoice {
  if (!accounts.length) return { kind: "none" };
  const wanted = bare(slotUsername);
  if (wanted) {
    const match = accounts.find((account) => bare(account.username) === wanted);
    if (!match) return { kind: "no_match", wanted, found: accounts.map((account) => account.username) };
    if (takenIgUserIds.includes(match.igUserId)) return { kind: "taken", username: match.username };
    return { kind: "connect", account: match };
  }
  const free = accounts.filter((account) => !takenIgUserIds.includes(account.igUserId));
  if (!free.length) return { kind: "taken", username: accounts[0].username };
  return free.length === 1 ? { kind: "connect", account: free[0] } : { kind: "pick", accounts: free };
}

// ---- the token we keep

export type TokenCheck = { valid: boolean; expiresAt: string | null };

/**
 * Whether a token still works and when it stops: the earlier of its own
 * expiry and Meta's data-access expiry, or null for neither (a Page token
 * normally has no expiry; Meta may still report a data-access date, after
 * which she has to sign in again). Checked with the app's own token.
 */
export async function checkToken(fetchFn: Fetch, app: MetaApp, token: string): Promise<TokenCheck> {
  const { data } = await graphGet<{
    data?: { is_valid?: boolean; expires_at?: number; data_access_expires_at?: number };
  }>(fetchFn, graphUrl("/debug_token", { input_token: token, access_token: `${app.appId}|${app.appSecret}` }));
  const times = [data?.expires_at, data?.data_access_expires_at].filter((t): t is number => typeof t === "number" && t > 0);
  return {
    valid: Boolean(data?.is_valid),
    expiresAt: times.length ? new Date(Math.min(...times) * 1000).toISOString() : null,
  };
}

// ---- her posts

type RawMedia = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
  timestamp?: string;
  children?: { data?: { media_type?: string; media_url?: string; thumbnail_url?: string }[] };
};

const MEDIA_FIELDS =
  "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,children{media_type,media_url,thumbnail_url}";

// A video's (or reel's) cover frame is its thumbnail; its media_url is the video.
const imageOf = (item: { media_type?: string; media_url?: string; thumbnail_url?: string }) =>
  item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url;

/**
 * One post from Instagram as the sync saves it, or null if it has no image
 * to copy (a video Instagram gave no cover for, say). A carousel's image is
 * its first item's (a video first item: that video's cover).
 */
export function mapMedia(raw: RawMedia): ProviderMedia | null {
  let mediaType: MediaType;
  let imageUrl: string | undefined;
  if (raw.media_type === "CAROUSEL_ALBUM") {
    mediaType = "carousel";
    const first = raw.children?.data?.[0];
    imageUrl = (first && imageOf(first)) || raw.media_url;
  } else if (raw.media_type === "VIDEO") {
    mediaType = "video";
    imageUrl = raw.thumbnail_url;
  } else {
    mediaType = "image";
    imageUrl = raw.media_url;
  }
  if (!raw.id || !imageUrl || !raw.timestamp || Number.isNaN(Date.parse(raw.timestamp))) return null;
  return {
    igId: raw.id,
    mediaType,
    permalink: raw.permalink ?? null,
    caption: raw.caption ?? "",
    postedAt: new Date(raw.timestamp).toISOString(),
    imageUrl,
  };
}

/**
 * The Instagram account linked to the Page whose token this is, and its
 * most recent posts, newest first. Going through the Page (`/me` on a Page
 * token) means unlinking the account from the Page shows up here too.
 */
export async function fetchLinkedMedia(
  fetchFn: Fetch,
  pageToken: string,
  limit: number,
): Promise<{ account: ProviderAccount; media: ProviderMedia[] }> {
  const page = await graphGet<{ instagram_business_account?: { id: string; username?: string } }>(
    fetchFn,
    graphUrl("/me", { fields: "instagram_business_account{id,username}", access_token: pageToken }),
  );
  const ig = page.instagram_business_account;
  if (!ig?.id) throw new GraphError("No Instagram account linked to this Facebook Page any more.", 400, 190);
  const { data } = await graphGet<{ data?: RawMedia[] }>(
    fetchFn,
    graphUrl(`/${encodeURIComponent(ig.id)}/media`, {
      fields: MEDIA_FIELDS,
      limit: String(Math.min(Math.max(limit, 1), 100)),
      access_token: pageToken,
    }),
  );
  const media = (data ?? []).flatMap((raw) => mapMedia(raw) ?? []);
  media.sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
  return { account: { igUserId: ig.id, username: ig.username ?? "" }, media: media.slice(0, limit) };
}

/** A post's image, from Instagram's CDN (its links expire, so right after fetching). */
export async function downloadMediaImage(fetchFn: Fetch, url: string): Promise<{ data: Buffer; mimeType: string }> {
  if (!/^https:\/\//.test(url)) throw new Error("Not an Instagram image link.");
  const res = await fetchFn(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Instagram's image link answered ${res.status}.`);
  const mimeType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
  if (!mimeType.startsWith("image/")) throw new Error(`Instagram's image link sent ${mimeType}, not an image.`);
  return { data: Buffer.from(await res.arrayBuffer()), mimeType };
}

// ---- her videos

/**
 * A fresh link to a video post's file: `media_url` of a VIDEO (reels
 * included). null when Instagram leaves it out (media with copyrighted
 * content, e.g. licensed music) or the post isn't a video any more.
 */
export async function fetchVideoUrl(fetchFn: Fetch, pageToken: string, igId: string): Promise<string | null> {
  const media = await graphGet<{ media_type?: string; media_url?: string }>(
    fetchFn,
    graphUrl(`/${encodeURIComponent(igId)}`, { fields: "media_type,media_url", access_token: pageToken }),
  );
  return media.media_type === "VIDEO" && media.media_url ? media.media_url : null;
}

/**
 * A video file from Instagram's CDN, refused past `maxBytes`: up front when
 * the response says its size, and while reading when it doesn't, so a big
 * file is never held in memory whole. Gives up after `timeoutMs`.
 */
export async function downloadMediaVideo(
  fetchFn: Fetch,
  url: string,
  { maxBytes, timeoutMs }: { maxBytes: number; timeoutMs: number },
): Promise<{ data: Buffer; mimeType: string }> {
  if (!/^https:\/\//.test(url)) throw new Error("Not an Instagram video link.");
  const res = await fetchFn(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok || !res.body) throw new Error(`Instagram's video link answered ${res.status}.`);
  const mimeType = (res.headers.get("content-type") ?? "video/mp4").split(";")[0].trim();
  if (!mimeType.startsWith("video/")) throw new Error(`Instagram's video link sent ${mimeType}, not a video.`);
  const tooLarge = (bytes: number) =>
    new VideoTooLargeError(`The video is ${Math.round(bytes / 1048576)}MB, over the ${Math.round(maxBytes / 1048576)}MB limit.`);
  const declared = Number(res.headers.get("content-length"));
  if (declared > maxBytes) {
    await res.body.cancel().catch(() => {});
    throw tooLarge(declared);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw tooLarge(total);
    }
    chunks.push(value);
  }
  return { data: Buffer.concat(chunks), mimeType };
}
