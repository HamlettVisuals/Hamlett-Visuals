// Mock Instagram posts can never reach production, offline (`npm run
// test:unit`). Local dev and the live site share one database, so mock
// posts sit next to real ones; everything that decides what the site shows
// has to leave them out on production even if INSTAGRAM_MOCK=1 is set there:
//   - the mock gate (lib/instagram-connection.ts),
//   - signed-out API reads (access/publicRead.ts),
//   - the homepage data helper (lib/instagram-home.ts) and what the section
//     renders from it (lib/instagram-view.ts): no mock posts, and with only
//     mock data, the heading and a Follow link.
// The database is a small in-memory stand-in for Payload's Local API.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = (file: string) => import(pathToFileURL(path.join(ROOT, "src", ...file.split("/"))).href);
const { mockInstagramAllowed, connectionIsLive, realInstagramAllowed } = await load("lib/instagram-connection.ts");
const { readInstagramPosts } = await load("access/publicRead.ts");
const { getInstagramHome } = await load("lib/instagram-home.ts");
const { instagramView } = await load("lib/instagram-view.ts");

const ENV_KEYS = ["INSTAGRAM_MOCK", "VERCEL_ENV"] as const;
const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
function setEnv(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
}
afterEach(() => setEnv(saved as Record<string, string>));
const production = () => setEnv({ INSTAGRAM_MOCK: "1", VERCEL_ENV: "production" });

// ---- the gates

test("real accounts are only touched on the production deployment", () => {
  production();
  assert.equal(realInstagramAllowed(), true);
});

test("local dev and previews never touch real accounts, whatever INSTAGRAM_MOCK says", () => {
  for (const env of [
    {},
    { INSTAGRAM_MOCK: "1" },
    { INSTAGRAM_MOCK: "0" },
    { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "preview", INSTAGRAM_MOCK: "1" },
    { VERCEL_ENV: "development" },
    { VERCEL_ENV: "Production" },
  ]) {
    setEnv(env);
    assert.equal(realInstagramAllowed(), false, JSON.stringify(env));
  }
});

test("mock and real never both apply: no server may run both", () => {
  for (const env of [{}, { INSTAGRAM_MOCK: "1" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "production", INSTAGRAM_MOCK: "1" }, { VERCEL_ENV: "preview", INSTAGRAM_MOCK: "1" }]) {
    setEnv(env);
    assert.equal(mockInstagramAllowed() && realInstagramAllowed(), false, JSON.stringify(env));
  }
});

test("production never allows mock posts, even with INSTAGRAM_MOCK=1", () => {
  production();
  assert.equal(mockInstagramAllowed(), false);
});

test("mock posts only with INSTAGRAM_MOCK=1 exactly, off production", () => {
  setEnv({ INSTAGRAM_MOCK: "1" });
  assert.equal(mockInstagramAllowed(), true);
  setEnv({ INSTAGRAM_MOCK: "1", VERCEL_ENV: "preview" });
  assert.equal(mockInstagramAllowed(), true);
  setEnv({});
  assert.equal(mockInstagramAllowed(), false);
  setEnv({ INSTAGRAM_MOCK: "true" });
  assert.equal(mockInstagramAllowed(), false);
});

test("a connected mock account doesn't count as connected on production", () => {
  production();
  assert.equal(connectionIsLive({ status: "connected", isMock: true }), false);
  assert.equal(connectionIsLive({ status: "connected", isMock: false }), true);
});

test("signed-out API reads leave mock posts out on production", () => {
  production();
  assert.deepEqual(readInstagramPosts({ req: { user: null } }), { isMock: { not_equals: true } });
  setEnv({ INSTAGRAM_MOCK: "1" });
  assert.equal(readInstagramPosts({ req: { user: null } }), true);
});

// ---- the homepage

type Doc = Record<string, unknown> & { id: number };
type Where = Record<string, unknown>;

// Enough of Payload's Local API for lib/instagram-home.ts: find with
// and / equals / not_equals (incl. "connection.slot"), sort, limit, and
// findGlobal. `ignoreWhere` stands in for a query that forgot its filter,
// to show the helper doesn't rely on the database alone.
function fakePayload(db: { connections: Doc[]; posts: Doc[]; section: Record<string, unknown> }, { ignoreWhere = false } = {}) {
  const value = (doc: Doc, field: string) => {
    if (field === "connection.slot") return db.connections.find((c) => c.id === doc.connection)?.slot;
    return doc[field];
  };
  const matches = (doc: Doc, where?: Where): boolean => {
    if (!where || ignoreWhere) return true;
    return Object.entries(where).every(([key, cond]) => {
      if (key === "and") return (cond as Where[]).every((w) => matches(doc, w));
      const c = cond as { equals?: unknown; not_equals?: unknown };
      const v = value(doc, key);
      if ("equals" in c && v !== c.equals) return false;
      if ("not_equals" in c && v === c.not_equals) return false;
      return true;
    });
  };
  return {
    async find({ collection, where, sort, limit }: { collection: string; where?: Where; sort?: string; limit?: number }) {
      let docs = (collection === "instagram-connections" ? db.connections : db.posts).filter((doc) => matches(doc, where));
      if (sort === "-postedAt") docs = docs.toSorted((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
      return { docs: limit ? docs.slice(0, limit) : docs };
    },
    async findGlobal() {
      return db.section;
    },
  };
}

const post = (id: number, connection: number, isMock: boolean, day: number) => ({
  id,
  connection,
  isMock,
  url: `/hv-studio/api/instagram-posts/file/${id}.jpg?prefix=instagram`,
  caption: `${isMock ? "mock" : "real"} post ${id}`,
  mediaType: "image",
  permalink: `https://www.instagram.com/p/${id}/`,
  postedAt: `2026-10-${String(day).padStart(2, "0")}T12:00:00.000Z`,
});

// Today's shared database: slot 1 is a connected MOCK account with mock
// posts (one of them featured, made locally), slot 2 empty.
const mockOnly = () => ({
  connections: [{ id: 1, slot: 1, status: "connected", isMock: true }],
  posts: Array.from({ length: 20 }, (_, i) => post(100 + i, 1, true, 1 + i)),
  section: {
    showOnHomepage: true,
    heading: "Recent on Instagram",
    accounts: [
      { slot: 1, handle: "@hamlettvisuals", label: "", visible: true, featured: [post(105, 1, true, 6)] },
      { slot: 2, handle: "", label: "", visible: false, featured: [] },
    ],
  },
});

// After the real account is connected in slot 1 but before the mock posts
// are cleared: real and mock posts side by side, a mock one still featured.
const realAndLeftoverMock = () => {
  const db = mockOnly();
  db.connections = [{ id: 1, slot: 1, status: "connected", isMock: false }];
  db.posts = [
    ...db.posts,
    ...Array.from({ length: 12 }, (_, i) => post(200 + i, 1, false, 1 + i)),
  ];
  (db.section.accounts as { featured: unknown[] }[])[0].featured = [post(105, 1, true, 6), post(203, 1, false, 4)];
  return db;
};

const tileIds = (view: { kind: string; block?: { posts: { id: number }[] }; blocks?: { posts: { id: number }[] }[] }) =>
  (view.block ? [view.block] : view.blocks ?? []).flatMap((b) => b.posts.map((p) => p.id));
const isMockId = (id: number) => id >= 100 && id < 200;

test("production with only mock data: no posts, and the section falls back to heading + Follow", async () => {
  production();
  for (const ignoreWhere of [false, true]) {
    const db = mockOnly();
    const home = await getInstagramHome(fakePayload(db, { ignoreWhere }));
    assert.equal(home.mockAllowed, false);
    assert.deepEqual(home.connectedSlots, []);
    assert.deepEqual(home.recentBySlot, {});
    // The section itself goes to the browser: no mock pick may ride along.
    const sent = JSON.stringify(home.section);
    assert.ok(!/mock post|"isMock":true/.test(sent), `mock data in the section sent to the page: ${sent.slice(0, 200)}`);
    assert.deepEqual(home.section.accounts[0].featured, []);
    const view = instagramView(home.section, home, "@hamlettvisuals");
    assert.deepEqual(view, {
      kind: "follow",
      heading: "Recent on Instagram",
      follow: { handle: "@hamlettvisuals", url: "https://www.instagram.com/hamlettvisuals/" },
    });
  }
});

test("production with real posts beside leftover mock ones: only real posts, a featured mock pick dropped", async () => {
  production();
  for (const ignoreWhere of [false, true]) {
    const home = await getInstagramHome(fakePayload(realAndLeftoverMock(), { ignoreWhere }));
    assert.deepEqual(home.connectedSlots, [1]);
    assert.ok(home.recentBySlot[1].length > 0);
    assert.ok(home.recentBySlot[1].every((p: { id: number }) => !isMockId(p.id)), "no mock post among the recent ones");
    assert.deepEqual(home.section.accounts[0].featured.map((p: { id: number }) => p.id), [203], "only the real pick is sent to the page");
    const view = instagramView(home.section, home, "@hamlettvisuals");
    assert.equal(view.kind, "single");
    const ids = tileIds(view);
    // With the query's own filter the grid is full; without it (a query
    // that forgot the filter) the newest posts fetched are mostly mock ones,
    // which are dropped, so the grid is shorter but still never shows one.
    if (!ignoreWhere) assert.equal(ids.length, 9);
    assert.ok(ids.every((id: number) => !isMockId(id)), `no mock tile: ${ids}`);
    assert.equal(ids[0], 203, "the real featured pick leads");
  }
});

test("locally, with mock posts allowed, the same mock data does show (the gate is what hides it)", async () => {
  setEnv({ INSTAGRAM_MOCK: "1" });
  const home = await getInstagramHome(fakePayload(mockOnly()));
  assert.deepEqual(home.connectedSlots, [1]);
  const view = instagramView(home.section, home, "@hamlettvisuals");
  assert.equal(view.kind, "single");
  assert.equal(tileIds(view)[0], 105, "the featured mock post leads");
});

test("switched off, or no username anywhere: the section is left out", async () => {
  production();
  const db = mockOnly();
  const home = await getInstagramHome(fakePayload(db));
  assert.equal(instagramView(home.section, home, "").kind, "hidden");
  assert.equal(instagramView({ ...home.section, showOnHomepage: false }, home, "@hamlettvisuals").kind, "hidden");
});
