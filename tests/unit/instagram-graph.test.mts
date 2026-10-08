// The real Instagram connection (Instagram API with Facebook Login), offline
// (`npm run test:unit`): the token exchange, finding her Instagram account
// through her Pages, the media mapping, the token check, the real provider,
// and the connect flow's signed state and pick cookie. Every Meta response
// is faked; the global fetch throws, so nothing here can reach Meta.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = (file: string) => import(pathToFileURL(path.join(ROOT, "src", ...file.split("/"))).href);
const graph = await load("lib/instagram-graph.ts");
const { createRealProvider } = await load("lib/instagram-real-provider.ts");
const oauth = await load("lib/instagram-oauth-state.ts");

const realFetch = globalThis.fetch;
before(() => {
  globalThis.fetch = (() => {
    throw new Error("Tests must not call Meta.");
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
});

const APP = { appId: "app-123", appSecret: "shh-secret" };

type Route = (url: URL) => { status?: number; body: unknown } | undefined;

/** A fake fetch answering from `routes` in order of the first that matches; records every URL. */
function fakeMeta(...routes: Route[]) {
  const calls: URL[] = [];
  const fetchFn = (async (input: string | URL) => {
    const url = new URL(String(input));
    calls.push(url);
    for (const route of routes) {
      const answer = route(url);
      if (answer) return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 });
    }
    return new Response(JSON.stringify({ error: { message: `unexpected ${url.pathname}`, code: 1 } }), { status: 400 });
  }) as typeof fetch;
  return { fetchFn, calls };
}

const on = (pathname: string, answer: (url: URL) => { status?: number; body: unknown }): Route => (url) =>
  url.pathname.endsWith(pathname) ? answer(url) : undefined;

// ---- token exchange

test("the code becomes a long-lived user token in two steps, with the redirect URI and app secret", async () => {
  const { fetchFn, calls } = fakeMeta(
    on("/oauth/access_token", (url) =>
      url.searchParams.get("grant_type") === "fb_exchange_token"
        ? { body: { access_token: `long(${url.searchParams.get("fb_exchange_token")})`, expires_in: 5_184_000 } }
        : { body: { access_token: "short-1", expires_in: 3600 } },
    ),
  );
  assert.equal(await graph.exchangeCodeForUserToken(fetchFn, APP, "the-code"), "long(short-1)");

  assert.equal(calls.length, 2);
  const [first, second] = calls;
  assert.equal(first.host, "graph.facebook.com");
  assert.equal(first.searchParams.get("code"), "the-code");
  assert.equal(first.searchParams.get("client_id"), "app-123");
  assert.equal(first.searchParams.get("client_secret"), "shh-secret");
  assert.equal(first.searchParams.get("redirect_uri"), "https://hamlett-visuals.vercel.app/api/instagram/callback");
  assert.equal(second.searchParams.get("grant_type"), "fb_exchange_token");
  assert.equal(second.searchParams.get("fb_exchange_token"), "short-1");
});

test("a refused code is a GraphError with Meta's message and code", async () => {
  const { fetchFn } = fakeMeta(
    on("/oauth/access_token", () => ({
      status: 400,
      body: { error: { message: "This authorization code has been used.", type: "OAuthException", code: 100 } },
    })),
  );
  await assert.rejects(graph.exchangeCodeForUserToken(fetchFn, APP, "used"), (err: { name: string; message: string; code: number }) => {
    assert.equal(err.name, "GraphError");
    assert.equal(err.message, "This authorization code has been used.");
    assert.equal(err.code, 100);
    return true;
  });
});

test("the login dialog asks for the two scopes and comes back to the callback", () => {
  const url = new URL(graph.loginDialogUrl(APP, "signed.state"));
  assert.equal(url.host, "www.facebook.com");
  assert.equal(url.searchParams.get("client_id"), "app-123");
  assert.equal(url.searchParams.get("scope"), "instagram_basic,pages_show_list");
  assert.equal(url.searchParams.get("state"), "signed.state");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), graph.META_REDIRECT_URI);
  assert.equal(url.searchParams.has("client_secret"), false);
  assert.equal(url.searchParams.has("config_id"), false);
  assert.deepEqual(JSON.parse(url.searchParams.get("extras") ?? ""), { setup: { channel: "IG_API_ONBOARDING" } });
});

test("with a login configuration, the dialog sends config_id instead of scope", () => {
  const url = new URL(graph.loginDialogUrl({ ...APP, loginConfigId: "cfg-987" }, "signed.state"));
  assert.equal(url.searchParams.get("config_id"), "cfg-987");
  assert.equal(url.searchParams.has("scope"), false);
  assert.equal(url.searchParams.get("client_id"), "app-123");
  assert.equal(url.searchParams.get("state"), "signed.state");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), graph.META_REDIRECT_URI);
  assert.match(url.searchParams.get("extras") ?? "", /IG_API_ONBOARDING/);
});

test("META_LOGIN_CONFIG_ID is optional: read when set, left out when unset or blank", () => {
  const keys = ["META_APP_ID", "META_APP_SECRET", "META_LOGIN_CONFIG_ID", "META_EXTRA_SCOPES"] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.META_APP_ID = "app-123";
    process.env.META_APP_SECRET = "shh-secret";
    delete process.env.META_LOGIN_CONFIG_ID;
    delete process.env.META_EXTRA_SCOPES;
    assert.deepEqual(graph.metaAppFromEnv(), { appId: "app-123", appSecret: "shh-secret" });
    process.env.META_LOGIN_CONFIG_ID = "  ";
    assert.deepEqual(graph.metaAppFromEnv(), { appId: "app-123", appSecret: "shh-secret" });
    process.env.META_LOGIN_CONFIG_ID = "cfg-987";
    assert.deepEqual(graph.metaAppFromEnv(), { appId: "app-123", appSecret: "shh-secret", loginConfigId: "cfg-987" });
    delete process.env.META_APP_SECRET;
    assert.equal(graph.metaAppFromEnv(), null);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

// ---- extra scopes (META_EXTRA_SCOPES)

test("extra scopes: parsed from commas or spaces, junk and repeats dropped", () => {
  assert.deepEqual(graph.parseExtraScopes("business_management"), ["business_management"]);
  assert.deepEqual(graph.parseExtraScopes(" business_management, pages_read_engagement  business_management"), [
    "business_management",
    "pages_read_engagement",
  ]);
  assert.deepEqual(graph.parseExtraScopes("instagram_basic,Bad-Scope,&x=1"), []);
  assert.deepEqual(graph.parseExtraScopes(undefined), []);
  assert.deepEqual(graph.parseExtraScopes(""), []);
});

test("extra scopes: off by default, read from META_EXTRA_SCOPES when set", () => {
  const keys = ["META_APP_ID", "META_APP_SECRET", "META_LOGIN_CONFIG_ID", "META_EXTRA_SCOPES"] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.META_APP_ID = "app-123";
    process.env.META_APP_SECRET = "shh-secret";
    delete process.env.META_LOGIN_CONFIG_ID;
    delete process.env.META_EXTRA_SCOPES;
    assert.equal(graph.metaAppFromEnv().extraScopes, undefined);
    process.env.META_EXTRA_SCOPES = "business_management";
    assert.deepEqual(graph.metaAppFromEnv().extraScopes, ["business_management"]);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

test("extra scopes go after the two we always ask for; a login configuration replaces them all", () => {
  const app = { ...APP, extraScopes: ["business_management"] };
  const url = new URL(graph.loginDialogUrl(app, "s"));
  assert.equal(url.searchParams.get("scope"), "instagram_basic,pages_show_list,business_management");
  const configured = new URL(graph.loginDialogUrl({ ...app, loginConfigId: "cfg-987" }, "s"));
  assert.equal(configured.searchParams.has("scope"), false);
  assert.equal(configured.searchParams.get("config_id"), "cfg-987");
});

// ---- account lookup

const page = (id: string, ig?: { id: string; username: string }) => ({
  id,
  name: `Page ${id}`,
  access_token: `page-token-${id}`,
  ...(ig ? { instagram_business_account: ig } : {}),
});

test("lists only Pages with an Instagram account, following paging, without duplicates", async () => {
  const { fetchFn, calls } = fakeMeta(
    on("/me/accounts", (url) =>
      url.searchParams.get("after") === "p2"
        ? { body: { data: [page("3", { id: "ig-b", username: "hamlett.weddings" }), page("4", { id: "ig-a", username: "hamlettvisuals" })] } }
        : {
            body: {
              data: [page("1", { id: "ig-a", username: "hamlettvisuals" }), page("2")],
              paging: { next: "https://graph.facebook.com/v24.0/me/accounts?after=p2&access_token=user-token" },
            },
          },
    ),
  );
  const accounts = await graph.listLinkedAccounts(fetchFn, "user-token");
  assert.deepEqual(accounts, [
    { pageId: "1", pageName: "Page 1", pageToken: "page-token-1", igUserId: "ig-a", username: "hamlettvisuals" },
    { pageId: "3", pageName: "Page 3", pageToken: "page-token-3", igUserId: "ig-b", username: "hamlett.weddings" },
  ]);
  assert.equal(calls[0].searchParams.get("fields"), "id,name,access_token,instagram_business_account{id,username}");
  assert.equal(calls[0].searchParams.get("access_token"), "user-token");
});

test("no Pages, or none with Instagram linked: an empty list", async () => {
  const { fetchFn } = fakeMeta(on("/me/accounts", () => ({ body: { data: [page("1"), page("2")] } })));
  assert.deepEqual(await graph.listLinkedAccounts(fetchFn, "user-token"), []);
});

test("every shared Page is listed, linked or not; only linked ones become accounts", async () => {
  const { fetchFn } = fakeMeta(
    on("/me/accounts", () => ({
      body: { data: [page("1", { id: "ig-a", username: "hamlettvisuals" }), page("2"), { id: "3", name: "No token" }] },
    })),
  );
  const pages = await graph.listPages(fetchFn, "user-token");
  assert.deepEqual(
    pages.map((p: { pageName: string; instagram: unknown; pageToken: unknown }) => [p.pageName, p.instagram, p.pageToken]),
    [
      ["Page 1", { igUserId: "ig-a", username: "hamlettvisuals" }, "page-token-1"],
      ["Page 2", null, "page-token-2"],
      ["No token", null, null],
    ],
  );
  assert.deepEqual(
    graph.linkedAccountsOf(pages).map((a: { igUserId: string }) => a.igUserId),
    ["ig-a"],
  );
});

test("granted permissions come from /me/permissions, split into granted and declined", async () => {
  const { fetchFn, calls } = fakeMeta(
    on("/me/permissions", () => ({
      body: {
        data: [
          { permission: "pages_show_list", status: "granted" },
          { permission: "instagram_basic", status: "declined" },
          { permission: "public_profile", status: "granted" },
        ],
      },
    })),
  );
  assert.deepEqual(await graph.grantedPermissions(fetchFn, "user-token"), {
    granted: ["pages_show_list", "public_profile"],
    declined: ["instagram_basic"],
  });
  assert.equal(calls[0].searchParams.get("access_token"), "user-token");
});

const shared = (name: string, username?: string) => ({
  pageId: `id-${name}`,
  pageName: name,
  pageToken: `secret-token-${name}`,
  instagram: username ? { igUserId: `ig-${name}`, username } : null,
});

test("diagnostics: permissions granted, Pages returned, and which have Instagram linked; never a token or id", () => {
  const text: string = graph.describeLogin(
    { granted: ["instagram_basic", "pages_show_list", "public_profile"], declined: [] },
    [shared("Hamlett Visuals"), shared("Hamlett Weddings", "hamlett.weddings")],
  );
  assert.equal(
    text,
    'Facebook granted: instagram_basic, pages_show_list, public_profile. Pages returned: 2: "Hamlett Visuals" (no Instagram account linked); "Hamlett Weddings" (Instagram @hamlett.weddings).',
  );
  assert.doesNotMatch(text, /secret-token|id-Hamlett|ig-Hamlett/);
});

test("diagnostics: declined or missing permissions, and no Pages shared", () => {
  assert.equal(
    graph.describeLogin({ granted: ["public_profile"], declined: ["pages_show_list"] }, []),
    "Facebook granted: public_profile. Declined: pages_show_list. Missing: instagram_basic, pages_show_list. Pages returned: 0 (Facebook shared no Pages with the site).",
  );
  assert.equal(
    graph.describeLogin(null, [shared("Only")]),
    'Couldn\'t check which permissions Facebook granted. Pages returned: 1: "Only" (no Instagram account linked).',
  );
});

test("diagnostics: a long list of Pages is cut short", () => {
  const pages = Array.from({ length: 13 }, (_, i) => shared(`P${i + 1}`));
  const text: string = graph.describeLogin({ granted: ["instagram_basic", "pages_show_list"], declined: [] }, pages);
  assert.match(text, /Pages returned: 13: /);
  assert.match(text, /"P10" \(no Instagram account linked\), and 3 more\.$/);
  assert.doesNotMatch(text, /"P11"/);
});

const A = { pageId: "1", pageName: "", pageToken: "t1", igUserId: "ig-a", username: "hamlettvisuals" };
const B = { pageId: "2", pageName: "", pageToken: "t2", igUserId: "ig-b", username: "Hamlett.Weddings" };

test("choosing: nothing linked", () => {
  assert.deepEqual(graph.chooseAccount([], { slotUsername: "@hamlettvisuals" }), { kind: "none" });
  assert.deepEqual(graph.chooseAccount([], {}), { kind: "none" });
});

test("choosing: the slot's username picks its account, ignoring @ and case", () => {
  assert.deepEqual(graph.chooseAccount([A, B], { slotUsername: "@hamlett.weddings" }), { kind: "connect", account: B });
  assert.deepEqual(graph.chooseAccount([A, B], { slotUsername: "HamlettVisuals" }), { kind: "connect", account: A });
});

test("choosing: a username none of her accounts has says which ones it found", () => {
  assert.deepEqual(graph.chooseAccount([A, B], { slotUsername: "@someone" }), {
    kind: "no_match",
    wanted: "someone",
    found: ["hamlettvisuals", "Hamlett.Weddings"],
  });
});

test("choosing: an empty slot takes the only account, or lets her pick among several", () => {
  assert.deepEqual(graph.chooseAccount([A], { slotUsername: "" }), { kind: "connect", account: A });
  assert.deepEqual(graph.chooseAccount([A, B], { slotUsername: null }), { kind: "pick", accounts: [A, B] });
});

test("choosing: an account on the other slot is never connected twice", () => {
  assert.deepEqual(graph.chooseAccount([A, B], { takenIgUserIds: ["ig-a"] }), { kind: "connect", account: B });
  assert.deepEqual(graph.chooseAccount([A], { slotUsername: "@hamlettvisuals", takenIgUserIds: ["ig-a"] }), {
    kind: "taken",
    username: "hamlettvisuals",
  });
  assert.deepEqual(graph.chooseAccount([A], { takenIgUserIds: ["ig-a"] }), { kind: "taken", username: "hamlettvisuals" });
});

// ---- media mapping

test("a photo uses its media_url", () => {
  assert.deepEqual(
    graph.mapMedia({
      id: "1",
      media_type: "IMAGE",
      media_url: "https://cdn/1.jpg",
      permalink: "https://www.instagram.com/p/1/",
      caption: "Golden hour",
      timestamp: "2026-10-01T18:30:00+0000",
    }),
    {
      igId: "1",
      mediaType: "image",
      permalink: "https://www.instagram.com/p/1/",
      caption: "Golden hour",
      postedAt: "2026-10-01T18:30:00.000Z",
      imageUrl: "https://cdn/1.jpg",
    },
  );
});

test("a video (or reel) uses its thumbnail, not the video file", () => {
  const media = graph.mapMedia({
    id: "2",
    media_type: "VIDEO",
    media_url: "https://cdn/2.mp4",
    thumbnail_url: "https://cdn/2-cover.jpg",
    timestamp: "2026-10-02T10:00:00+0000",
  });
  assert.equal(media.mediaType, "video");
  assert.equal(media.imageUrl, "https://cdn/2-cover.jpg");
  assert.equal(media.caption, "");
  assert.equal(media.permalink, null);
});

test("a carousel uses its first item; a video first item, that video's cover", () => {
  const photoFirst = graph.mapMedia({
    id: "3",
    media_type: "CAROUSEL_ALBUM",
    media_url: "https://cdn/3-album.jpg",
    timestamp: "2026-10-03T10:00:00+0000",
    children: { data: [{ media_type: "IMAGE", media_url: "https://cdn/3a.jpg" }, { media_type: "IMAGE", media_url: "https://cdn/3b.jpg" }] },
  });
  assert.equal(photoFirst.mediaType, "carousel");
  assert.equal(photoFirst.imageUrl, "https://cdn/3a.jpg");

  const videoFirst = graph.mapMedia({
    id: "4",
    media_type: "CAROUSEL_ALBUM",
    timestamp: "2026-10-03T10:00:00+0000",
    children: { data: [{ media_type: "VIDEO", media_url: "https://cdn/4a.mp4", thumbnail_url: "https://cdn/4a.jpg" }] },
  });
  assert.equal(videoFirst.imageUrl, "https://cdn/4a.jpg");

  const noChildren = graph.mapMedia({ id: "5", media_type: "CAROUSEL_ALBUM", media_url: "https://cdn/5.jpg", timestamp: "2026-10-03T10:00:00+0000" });
  assert.equal(noChildren.imageUrl, "https://cdn/5.jpg");
});

test("a post with no image to copy, or no date, is skipped", () => {
  assert.equal(graph.mapMedia({ id: "6", media_type: "VIDEO", media_url: "https://cdn/6.mp4", timestamp: "2026-10-03T10:00:00+0000" }), null);
  assert.equal(graph.mapMedia({ id: "7", media_type: "IMAGE", media_url: "https://cdn/7.jpg" }), null);
});

const mediaRoutes = (posts: unknown[]) => [
  on("/me", () => ({ body: { instagram_business_account: { id: "ig-a", username: "hamlettvisuals" }, id: "page-1" } })),
  on("/ig-a/media", () => ({ body: { data: posts } })),
];

test("recent media goes through the Page to its Instagram account, newest first, up to the limit", async () => {
  const { fetchFn, calls } = fakeMeta(
    ...mediaRoutes([
      { id: "old", media_type: "IMAGE", media_url: "https://cdn/old.jpg", timestamp: "2026-09-01T00:00:00+0000" },
      { id: "new", media_type: "IMAGE", media_url: "https://cdn/new.jpg", timestamp: "2026-10-05T00:00:00+0000" },
      { id: "skip", media_type: "VIDEO", timestamp: "2026-10-06T00:00:00+0000" },
      { id: "mid", media_type: "IMAGE", media_url: "https://cdn/mid.jpg", timestamp: "2026-09-20T00:00:00+0000" },
    ]),
  );
  const { account, media } = await graph.fetchLinkedMedia(fetchFn, "page-token", 2);
  assert.deepEqual(account, { igUserId: "ig-a", username: "hamlettvisuals" });
  assert.deepEqual(media.map((m: { igId: string }) => m.igId), ["new", "mid"]);
  assert.equal(calls[0].searchParams.get("access_token"), "page-token");
  assert.match(calls[1].searchParams.get("fields") ?? "", /^id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,children\{/);
  assert.equal(calls[1].searchParams.get("limit"), "2");
});

// ---- token check

test("a Page token with no expiry: valid, no date", async () => {
  const { fetchFn, calls } = fakeMeta(on("/debug_token", () => ({ body: { data: { is_valid: true, expires_at: 0 } } })));
  assert.deepEqual(await graph.checkToken(fetchFn, APP, "page-token"), { valid: true, expiresAt: null });
  assert.equal(calls[0].searchParams.get("input_token"), "page-token");
  assert.equal(calls[0].searchParams.get("access_token"), "app-123|shh-secret");
});

test("the token check reports the earlier of its expiry and Meta's data-access expiry", async () => {
  const dataAccess = Date.UTC(2027, 0, 5) / 1000;
  const { fetchFn } = fakeMeta(
    on("/debug_token", () => ({ body: { data: { is_valid: true, expires_at: 0, data_access_expires_at: dataAccess } } })),
  );
  assert.deepEqual(await graph.checkToken(fetchFn, APP, "page-token"), { valid: true, expiresAt: "2027-01-05T00:00:00.000Z" });
});

// ---- the real provider

test("real provider: posts come back as the sync expects", async () => {
  const { fetchFn } = fakeMeta(
    ...mediaRoutes([{ id: "1", media_type: "IMAGE", media_url: "https://cdn/1.jpg", timestamp: "2026-10-05T00:00:00+0000" }]),
  );
  const provider = createRealProvider({ fetchFn, app: () => APP });
  const result = await provider.fetchRecentMedia({ slot: 1, accessToken: "page-token", limit: 50 });
  assert.equal(result.ok, true);
  assert.equal(result.account.username, "hamlettvisuals");
  assert.equal(result.media[0].imageUrl, "https://cdn/1.jpg");
});

test("real provider: a dead token means reconnect, other failures retry tomorrow", async () => {
  const dead = fakeMeta(
    on("/me", () => ({ status: 400, body: { error: { message: "Error validating access token", type: "OAuthException", code: 190 } } })),
  );
  const result = await createRealProvider({ fetchFn: dead.fetchFn, app: () => APP }).fetchRecentMedia({
    slot: 1,
    accessToken: "page-token",
    limit: 50,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "auth");
  assert.doesNotMatch(result.message, /page-token/);

  const down = fakeMeta(on("/me", () => ({ status: 500, body: { error: { message: "Service temporarily unavailable", code: 2 } } })));
  const retry = await createRealProvider({ fetchFn: down.fetchFn, app: () => APP }).fetchRecentMedia({
    slot: 1,
    accessToken: "page-token",
    limit: 50,
  });
  assert.equal(retry.reason, "error");
});

test("real provider: unlinking Instagram from the Page means reconnect", async () => {
  const { fetchFn } = fakeMeta(on("/me", () => ({ body: { id: "page-1" } })));
  const result = await createRealProvider({ fetchFn, app: () => APP }).fetchRecentMedia({ slot: 1, accessToken: "t", limit: 50 });
  assert.equal(result.reason, "auth");
});

test("real provider: no token yet is 'not configured', and nothing is fetched", async () => {
  const { fetchFn, calls } = fakeMeta();
  const result = await createRealProvider({ fetchFn, app: () => APP }).fetchRecentMedia({ slot: 2, accessToken: null, limit: 50 });
  assert.equal(result.reason, "not_configured");
  assert.equal(calls.length, 0);
});

test("real provider: the daily check keeps the same token and records when it stops", async () => {
  const { fetchFn } = fakeMeta(on("/debug_token", () => ({ body: { data: { is_valid: true, expires_at: 0 } } })));
  assert.deepEqual(await createRealProvider({ fetchFn, app: () => APP }).refreshToken({ accessToken: "page-token" }), {
    ok: true,
    accessToken: "page-token",
    expiresAt: null,
  });

  const invalid = fakeMeta(on("/debug_token", () => ({ body: { data: { is_valid: false } } })));
  const result = await createRealProvider({ fetchFn: invalid.fetchFn, app: () => APP }).refreshToken({ accessToken: "page-token" });
  assert.equal(result.reason, "auth");

  const noApp = await createRealProvider({ fetchFn, app: () => null }).refreshToken({ accessToken: "page-token" });
  assert.equal(noApp.reason, "not_configured");
});

test("real provider: downloads the image from its link", async () => {
  const calls: string[] = [];
  const fetchFn = (async (url: string) => {
    calls.push(String(url));
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
  }) as typeof fetch;
  const image = await createRealProvider({ fetchFn, app: () => APP }).downloadImage({ imageUrl: "https://cdn/1.jpg" });
  assert.deepEqual([...image.data], [1, 2, 3]);
  assert.equal(image.mimeType, "image/jpeg");
  assert.deepEqual(calls, ["https://cdn/1.jpg"]);
});

// ---- connect flow state and pick cookie

const SECRET = "payload-secret";
const NOW = Date.UTC(2026, 9, 7, 12);
const state = { slot: 2, userId: "7", nonce: "nonce-abc", expiresAt: NOW + 600_000 };

test("state: round-trips with the right secret and cookie", () => {
  const signed = oauth.signState(state, SECRET);
  assert.deepEqual(oauth.verifyState(signed, { secret: SECRET, cookieNonce: "nonce-abc", now: NOW }), state);
});

test("state: refused when tampered with, expired, or from another browser", () => {
  const signed: string = oauth.signState(state, SECRET);
  const [body, sig] = signed.split(".");
  const forged = Buffer.from(JSON.stringify({ ...state, slot: 1 })).toString("base64url");
  assert.equal(oauth.verifyState(`${forged}.${sig}`, { secret: SECRET, cookieNonce: "nonce-abc", now: NOW }), null);
  assert.equal(oauth.verifyState(`${body}.${sig}`, { secret: "other", cookieNonce: "nonce-abc", now: NOW }), null);
  assert.equal(oauth.verifyState(signed, { secret: SECRET, cookieNonce: "nonce-abc", now: NOW + 600_001 }), null);
  assert.equal(oauth.verifyState(signed, { secret: SECRET, cookieNonce: "nonce-xyz", now: NOW }), null);
  assert.equal(oauth.verifyState(signed, { secret: SECRET, cookieNonce: undefined, now: NOW }), null);
  assert.equal(oauth.verifyState(null, { secret: SECRET, cookieNonce: "nonce-abc", now: NOW }), null);
});

test("pick cookie: encrypted (the token isn't readable in it) and only opens with our secret, unexpired", () => {
  const ticket = { slot: 1, userId: "7", userToken: "long-user-token", expiresAt: NOW + 600_000 };
  const sealed: string = oauth.sealPick(ticket, SECRET);
  assert.doesNotMatch(sealed, /long-user-token/);
  assert.doesNotMatch(Buffer.from(sealed.split(".")[2], "base64url").toString("latin1"), /long-user-token/);
  assert.deepEqual(oauth.openPick(sealed, SECRET, NOW), ticket);
  assert.equal(oauth.openPick(sealed, "other", NOW), null);
  assert.equal(oauth.openPick(sealed, SECRET, NOW + 600_001), null);
  assert.equal(oauth.openPick(`${sealed}x`, SECRET, NOW), null);
});

// ---- videos

test("a video's fresh link: media_url of a VIDEO; none when Instagram leaves it out", async () => {
  const { fetchFn, calls } = fakeMeta(
    on("/v1", () => ({ body: { id: "v1", media_type: "VIDEO", media_url: "https://cdn/v1.mp4" } })),
    on("/v2", () => ({ body: { id: "v2", media_type: "VIDEO" } })),
    on("/c1", () => ({ body: { id: "c1", media_type: "CAROUSEL_ALBUM", media_url: "https://cdn/c1.jpg" } })),
  );
  assert.equal(await graph.fetchVideoUrl(fetchFn, "page-token", "v1"), "https://cdn/v1.mp4");
  assert.equal(await graph.fetchVideoUrl(fetchFn, "page-token", "v2"), null);
  assert.equal(await graph.fetchVideoUrl(fetchFn, "page-token", "c1"), null);
  assert.equal(calls[0].searchParams.get("fields"), "media_type,media_url");
  assert.equal(calls[0].searchParams.get("access_token"), "page-token");
});

test("real provider: a video link Meta refuses means reconnect; no token is 'not configured'", async () => {
  const { fetchFn } = fakeMeta(on("/v1", () => ({ status: 400, body: { error: { message: "Invalid OAuth access token", code: 190 } } })));
  const provider = createRealProvider({ fetchFn, app: () => APP });
  assert.equal((await provider.fetchVideoUrl({ igId: "v1", accessToken: "page-token" })).reason, "auth");
  assert.equal((await provider.fetchVideoUrl({ igId: "v1", accessToken: null })).reason, "not_configured");
});

const videoResponse = (bytes: number, headers: Record<string, string> = {}) =>
  (async () =>
    new Response(new Uint8Array(bytes), { headers: { "content-type": "video/mp4", ...headers } })) as unknown as typeof fetch;

test("a video download returns its bytes and type", async () => {
  const video = await graph.downloadMediaVideo(videoResponse(1000), "https://cdn/v.mp4", { maxBytes: 5000, timeoutMs: 1000 });
  assert.equal(video.data.length, 1000);
  assert.equal(video.mimeType, "video/mp4");
});

test("a video over the cap is refused from its declared size, before reading it", async () => {
  let read = false;
  const fetchFn = (async () =>
    new Response(
      new ReadableStream(
        {
          pull(controller) {
            read = true;
            controller.enqueue(new Uint8Array(10));
          },
        },
        // Nothing pulled until someone reads.
        { highWaterMark: 0 },
      ),
      { headers: { "content-type": "video/mp4", "content-length": "6000" } },
    )) as unknown as typeof fetch;
  await assert.rejects(graph.downloadMediaVideo(fetchFn, "https://cdn/v.mp4", { maxBytes: 5000, timeoutMs: 1000 }), {
    name: "VideoTooLargeError",
  });
  assert.equal(read, false);
});

test("a video over the cap with no declared size is refused while reading", async () => {
  await assert.rejects(graph.downloadMediaVideo(videoResponse(6000), "https://cdn/v.mp4", { maxBytes: 5000, timeoutMs: 1000 }), {
    name: "VideoTooLargeError",
  });
});

test("a video link that sends something else, or isn't https, is refused", async () => {
  const html = (async () => new Response("<html>", { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
  await assert.rejects(graph.downloadMediaVideo(html, "https://cdn/v.mp4", { maxBytes: 5000, timeoutMs: 1000 }), /not a video/);
  await assert.rejects(graph.downloadMediaVideo(videoResponse(10), "http://cdn/v.mp4", { maxBytes: 5000, timeoutMs: 1000 }), /Not an Instagram video link/);
});
