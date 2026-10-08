// Copying Instagram videos into R2 (lib/instagram-videos.ts), offline
// (`npm run test:unit`): which posts keep a video, the per-run limits (and
// what's left reported as pending), videos with no link from Instagram or
// over the size cap, pruning videos whose post left the set, the report
// saved on the connection, and the gates: a real account only on
// production, mock only where mock posts are allowed, never the other
// kind's connection. Payload is an in-memory stand-in and the providers
// are fakes; nothing reaches Instagram or R2.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { fakePayload } from "./lib/fake-payload.mts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = (file: string) => import(pathToFileURL(path.join(ROOT, "src", ...file.split("/"))).href);
const { videosToKeep, copyVideos, newVideoBudget } = await load("lib/instagram-videos.ts");
const { VideoTooLargeError } = await load("lib/instagram-provider.ts");
const limits = await load("lib/instagram-video-limits.ts");

const ENV_KEYS = ["INSTAGRAM_MOCK", "VERCEL_ENV"] as const;
const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
function setEnv(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
}
afterEach(() => setEnv(saved as Record<string, string>));
const production = () => setEnv({ VERCEL_ENV: "production" });
const localMock = () => setEnv({ INSTAGRAM_MOCK: "1" });

// Post n was posted n days ago; `types` gives each one's media type.
const day = (n: number) => new Date(Date.UTC(2026, 9, 20 - n)).toISOString();
const postsOf = (types: string, connection = 1) =>
  [...types].map((t, i) => ({
    id: i + 1,
    igId: `ig-${i + 1}`,
    connection,
    postedAt: day(i + 1),
    mediaType: t === "v" ? "video" : t === "c" ? "carousel" : "image",
  }));

// ---- which posts keep a video

test("featured picks (in her order) and the 9 most recent; videos only, each once", () => {
  //            1 2 3 4 5 6 7 8 9 10 11 12
  const posts = postsOf("vcvccvccvccv");
  const keep = videosToKeep(posts, [12, 3, 2]);
  assert.deepEqual(keep.map((p: { id: number }) => p.id), [12, 3, 1, 6, 9]);
});

test("old videos that aren't featured don't keep theirs", () => {
  const posts = postsOf("ccccccccccvv");
  assert.deepEqual(videosToKeep(posts, []), []);
  assert.deepEqual(videosToKeep(posts, ["11"]).map((p: { id: number }) => p.id), [11]);
});

test("featured ids that aren't this account's posts are ignored", () => {
  assert.deepEqual(videosToKeep(postsOf("v"), [99]).map((p: { id: number }) => p.id), [1]);
});

// ---- copying

function provider({
  isMock = false,
  noLink = [] as string[],
  tooLarge = [] as string[],
  fail = [] as string[],
  onDownload = () => {},
} = {}) {
  const calls = { links: [] as string[], downloads: [] as string[] };
  return {
    calls,
    name: isMock ? "mock" : "real",
    isMock,
    async fetchRecentMedia() {
      throw new Error("not used");
    },
    async refreshToken() {
      throw new Error("not used");
    },
    async downloadImage() {
      throw new Error("not used");
    },
    async fetchVideoUrl({ igId, accessToken }: { igId: string; accessToken: string | null }) {
      calls.links.push(igId);
      if (!isMock) assert.equal(accessToken, "page-token");
      return { ok: true, url: noLink.includes(igId) ? null : `https://cdn/${igId}.mp4` };
    },
    async downloadVideo(url: string, maxBytes: number) {
      const igId = url.replace("https://cdn/", "").replace(".mp4", "");
      calls.downloads.push(igId);
      assert.equal(maxBytes, limits.INSTAGRAM_VIDEO_MAX_MB * 1024 * 1024);
      onDownload();
      if (tooLarge.includes(igId)) throw new VideoTooLargeError("too big");
      if (fail.includes(igId)) throw new Error("CDN said no");
      return { data: Buffer.from(`video ${igId}`), mimeType: "video/mp4" };
    },
  };
}

function world(types: string, { isMock = false, videos = [] as { id: number; post: number }[] } = {}) {
  return fakePayload({
    "instagram-connections": [{ id: 1, slot: 1, status: "connected", isMock }],
    "instagram-posts": postsOf(types).map((p) => ({ ...p, isMock })),
    "instagram-videos": videos.map((v) => ({ ...v, filename: `ig-${v.post}.mp4`, isMock })),
  });
}

const run = (payload: unknown, p: ReturnType<typeof provider>, extra: Record<string, unknown> = {}) =>
  copyVideos(payload, {
    connection: { id: 1, isMock: p.isMock },
    provider: p,
    accessToken: p.isMock ? null : "page-token",
    featuredIds: [],
    budget: newVideoBudget(),
    ...extra,
  });

test("copies each kept video into instagram-videos and reports it on the connection", async () => {
  production();
  const { payload, writes, collections } = world("vcvcc");
  const p = provider();
  const report = await run(payload, p);
  assert.equal(report.kept, 2);
  assert.equal(report.copied, 2);
  assert.deepEqual(p.calls.downloads, ["ig-1", "ig-3"]);
  const created = writes.filter((w) => w.op === "create");
  assert.deepEqual(created.map((w) => [w.collection, w.file?.name, (w.data as { post: number }).post, (w.data as { isMock: boolean }).isMock]), [
    ["instagram-videos", "ig-1.mp4", 1, false],
    ["instagram-videos", "ig-3.mp4", 3, false],
  ]);
  assert.deepEqual(collections["instagram-connections"][0].lastVideoReport, report);
});

test("already copied videos aren't fetched again", async () => {
  production();
  const { payload } = world("vcv", { videos: [{ id: 50, post: 1 }] });
  const p = provider();
  const report = await run(payload, p);
  assert.equal(report.alreadyCopied, 1);
  assert.equal(report.copied, 1);
  assert.deepEqual(p.calls.links, ["ig-3"]);
});

test("no video link from Instagram, too large, or failed: counted, and the rest still copied", async () => {
  production();
  const { payload } = world("vvvvv");
  const p = provider({ noLink: ["ig-1"], tooLarge: ["ig-2"], fail: ["ig-3"] });
  const report = await run(payload, p);
  assert.deepEqual(
    { kept: report.kept, copied: report.copied, noMediaUrl: report.noMediaUrl, tooLarge: report.tooLarge, failed: report.failed, pending: report.pending },
    { kept: 5, copied: 2, noMediaUrl: 1, tooLarge: 1, failed: 1, pending: 0 },
  );
  assert.equal(p.calls.downloads.includes("ig-1"), false, "no download without a link");
});

test("at most VIDEOS_PER_RUN downloads per run; the rest are pending, and the budget is shared", async () => {
  production();
  const { payload } = world("vvvvvvvvv");
  const p = provider();
  const budget = newVideoBudget();
  const first = await run(payload, p, { budget });
  assert.equal(first.copied, limits.VIDEOS_PER_RUN);
  assert.equal(first.pending, 9 - limits.VIDEOS_PER_RUN);
  assert.equal(budget.downloadsLeft, 0);

  // Same run (another account, say): nothing more downloaded.
  const again = await run(payload, provider(), { budget });
  assert.equal(again.copied, 0);
  assert.equal(again.pending, 9 - limits.VIDEOS_PER_RUN);

  // Next run picks up the rest.
  const next = await run(payload, provider());
  assert.equal(next.copied, 9 - limits.VIDEOS_PER_RUN);
  assert.equal(next.pending, 0);
  assert.equal(next.alreadyCopied, limits.VIDEOS_PER_RUN);
});

test("no new download starts once the video phase has run its time", async () => {
  production();
  const { payload } = world("vvvv");
  let clock = Date.UTC(2026, 9, 20);
  const p = provider({ onDownload: () => (clock += 70_000) });
  const report = await run(payload, p, { now: () => clock, budget: newVideoBudget(clock) });
  // 120s phase: downloads at t=0 and t=70s start; at t=140s none does.
  assert.equal(report.copied, 2);
  assert.equal(report.pending, 2);
});

test("no new download starts past the whole run's deadline, even early in the video phase", async () => {
  production();
  const { payload } = world("vv");
  const start = Date.UTC(2026, 9, 20);
  const clock = start + (limits.RUN_SECONDS - 1) * 1000;
  const p = provider({ onDownload: () => {} });
  let now = clock;
  const report = await run(payload, { ...p, downloadVideo: async (...args: [string, number]) => { now += 5_000; return p.downloadVideo(...args); } }, { now: () => now, budget: newVideoBudget(start) });
  assert.equal(report.copied, 1);
  assert.equal(report.pending, 1);
});

test("a video whose post left the set is deleted; a featured old video keeps its own", async () => {
  production();
  //                      1..9 recent carousels, 10 and 11 old videos
  const { payload, writes, collections } = world("cccccccccvv", { videos: [{ id: 70, post: 10 }, { id: 71, post: 11 }] });
  const report = await run(payload, provider(), { featuredIds: [11] });
  assert.equal(report.removed, 1);
  assert.deepEqual(writes.filter((w) => w.op === "delete").map((w) => [w.collection, w.ids]), [["instagram-videos", [70]]]);
  assert.deepEqual(collections["instagram-videos"].map((v) => v.id), [71]);
});

// ---- the gates

test("a real account is never touched off production: nothing fetched, nothing written", async () => {
  for (const env of [{}, { INSTAGRAM_MOCK: "1" }, { VERCEL_ENV: "preview" }]) {
    setEnv(env);
    const { payload, writes } = world("vvv");
    const p = provider();
    assert.equal(await run(payload, p), null, JSON.stringify(env));
    assert.deepEqual(writes, []);
    assert.deepEqual(p.calls.links, []);
  }
});

test("mock videos only where mock posts are allowed, never on production", async () => {
  localMock();
  const local = world("vv", { isMock: true });
  const report = await run(local.payload, provider({ isMock: true }));
  assert.equal(report.copied, 2);
  assert.ok(local.writes.filter((w) => w.op === "create").every((w) => (w.data as { isMock: boolean }).isMock === true));

  setEnv({ INSTAGRAM_MOCK: "1", VERCEL_ENV: "production" });
  const prod = world("vv", { isMock: true });
  assert.equal(await run(prod.payload, provider({ isMock: true })), null);
  assert.deepEqual(prod.writes, []);
});

test("a provider never touches the other kind's connection", async () => {
  localMock();
  const { payload, writes } = world("vv", { isMock: false });
  const mock = provider({ isMock: true });
  assert.equal(
    await copyVideos(payload, { connection: { id: 1, isMock: false }, provider: mock, accessToken: null, featuredIds: [], budget: newVideoBudget() }),
    null,
  );
  assert.deepEqual(writes, []);

  production();
  const real = provider();
  assert.equal(
    await copyVideos(payload, { connection: { id: 1, isMock: true }, provider: real, accessToken: "page-token", featuredIds: [], budget: newVideoBudget() }),
    null,
  );
  assert.deepEqual(writes, []);
});
