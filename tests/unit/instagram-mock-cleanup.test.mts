// The mock Instagram cleanup (lib/instagram-mock-cleanup.ts, run by
// `npm run instagram:clear-mock`) can never delete a file outside the mock
// prefixes ("instagram/mock-…", "instagram-videos/mock-…"): not her real
// posts' images or videos, not her Backstage videos, nothing else in the
// bucket. Offline (`npm run test:unit`), with an in-memory Payload and a
// fake R2 that records every delete.
//
// How a file gets deleted, and why each path is covered here:
//   - R2 keys it deletes itself (leftovers): listed under the mock prefixes
//     only, and each checked again by isMockFileKey;
//   - Payload deletes of mock video / post records, whose storage plugin
//     removes "<collection folder>/<filename>" (and a post's thumbnail):
//     every record's folder and file names are checked first
//     (mockFileProblem) and one bad record stops everything.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { fakePayload } from "./lib/fake-payload.mts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = (file: string) => import(pathToFileURL(path.join(ROOT, "src", ...file.split("/"))).href);
const { isMockFileKey, mockFileProblem, clearMockInstagram, MOCK_FILE_PREFIXES } = await load("lib/instagram-mock-cleanup.ts");
const { UPLOAD_FOLDERS } = await load("lib/upload-folders.ts");

// ---- which keys count as mock files

test("the mock prefixes are the Instagram image and video folders' mock- names, and nothing Backstage", () => {
  assert.deepEqual(MOCK_FILE_PREFIXES, ["instagram/mock-", "instagram-videos/mock-"]);
  assert.notEqual(UPLOAD_FOLDERS["instagram-videos"], UPLOAD_FOLDERS.backstage);
});

test("only plain mock- files directly under a mock prefix are mock files", () => {
  for (const key of ["instagram-videos/mock-2-07.mp4", "instagram/mock-1-01.jpg", "instagram/mock-1-01-320x400.jpg", "instagram-videos/mock-2-07-1.mp4"]) {
    assert.equal(isMockFileKey(key), true, key);
  }
  for (const key of [
    "backstage/mock-2-07.mp4",
    "backstage/reel.mp4",
    "instagram-videos/17920807557125731.mp4",
    "instagram/18029361224846647.jpg",
    "instagram-videos/mock-../backstage/reel.mp4",
    "instagram-videos/mock-x/../../backstage/reel.mp4",
    "instagram-videos/sub/mock-1.mp4",
    "instagram-videos/mock-",
    "photos/mock-1.jpg",
    "mock-1.mp4",
    "",
  ]) {
    assert.equal(isMockFileKey(key), false, key);
  }
});

test("a record is only safe to delete if all its files are mock files in its own folder", () => {
  assert.equal(mockFileProblem("instagram-videos", { id: 1, filename: "mock-2-02.mp4", prefix: "instagram-videos" }), null);
  assert.equal(
    mockFileProblem("instagram-posts", { id: 2, filename: "mock-1-01.jpg", prefix: "instagram", sizes: { thumbnail: { filename: "mock-1-01-320x400.jpg" } } }),
    null,
  );
  assert.match(mockFileProblem("instagram-videos", { id: 3, filename: "reel.mp4", prefix: "instagram-videos" }), /isn't a mock one/);
  assert.match(mockFileProblem("instagram-videos", { id: 4, filename: "mock-1.mp4", prefix: "backstage" }), /stored under "backstage"/);
  assert.match(mockFileProblem("instagram-videos", { id: 5, filename: "../backstage/reel.mp4" }), /isn't a mock one/);
  assert.match(mockFileProblem("instagram-videos", { id: 6, filename: null }), /no file name/);
  assert.match(
    mockFileProblem("instagram-posts", { id: 7, filename: "mock-1-01.jpg", sizes: { thumbnail: { filename: "her-photo-320x400.jpg" } } }),
    /isn't a mock one/,
  );
});

// ---- the whole cleanup

// The shared database as it could be: her real connection, posts and
// videos; mock ones; and a fake R2 holding her Backstage videos, real
// Instagram files, mock files and a mock leftover.
function world({ extraVideos = [] as ({ id: number } & Record<string, unknown>)[] } = {}) {
  const db = fakePayload({
    "instagram-connections": [
      { id: 2, slot: 1, isMock: false, username: "hamlettvisuals" },
      { id: 3, slot: 2, isMock: true, username: "hamlettvisuals.2" },
    ],
    "instagram-tokens": [{ id: 9, connection: 2 }],
    "instagram-posts": [
      { id: 61, igId: "18622186981000665", connection: 2, isMock: false, filename: "18622186981000665.jpg", prefix: "instagram" },
      { id: 76, igId: "17920807557125731", connection: 2, isMock: false, filename: "17920807557125731.jpg", prefix: "instagram" },
      {
        id: 101,
        igId: "mock-2-01",
        connection: 3,
        isMock: true,
        filename: "mock-2-01.jpg",
        prefix: "instagram",
        sizes: { thumbnail: { filename: "mock-2-01-320x400.jpg" } },
      },
      { id: 102, igId: "mock-2-02", connection: 3, isMock: true, filename: "mock-2-02.jpg", prefix: "instagram" },
    ],
    "instagram-videos": [
      { id: 201, post: 76, isMock: false, filename: "17920807557125731.mp4", prefix: "instagram-videos" },
      { id: 202, post: 102, isMock: true, filename: "mock-2-02.mp4", prefix: "instagram-videos" },
      ...extraVideos,
    ],
  });
  const bucket = [
    "backstage/her-reel.mp4",
    "backstage/mock-2-02.mp4",
    "instagram/18622186981000665.jpg",
    "instagram-videos/17920807557125731.mp4",
    "instagram/mock-2-01.jpg",
    "instagram/mock-2-01-320x400.jpg",
    "instagram/mock-2-02.jpg",
    "instagram-videos/mock-2-02.mp4",
    "instagram-videos/mock-2-09.mp4",
    "instagram-videos/mock-../backstage/her-reel.mp4",
  ];
  const r2 = {
    listed: [] as string[],
    // Every key removed, by the cleanup itself or by Payload's storage plugin.
    deleted: [] as string[],
    bucket,
    async listKeys(prefix: string) {
      r2.listed.push(prefix);
      return r2.bucket.filter((key) => key.startsWith(prefix));
    },
    async deleteKeys(keys: string[]) {
      r2.deleted.push(...keys);
      r2.bucket = r2.bucket.filter((key) => !keys.includes(key));
    },
  };
  // Like the storage plugin: deleting an upload record removes
  // "<its collection's folder>/<filename>" and its sizes' files.
  const folders: Record<string, string> = { "instagram-posts": "instagram", "instagram-videos": "instagram-videos" };
  const deleteRecords = db.payload.delete;
  db.payload.delete = async (args) => {
    const result = await deleteRecords(args);
    const folder = folders[args.collection];
    if (folder) {
      for (const doc of result.docs as { filename?: string; sizes?: Record<string, { filename?: string }> }[]) {
        const names = [doc.filename, ...Object.values(doc.sizes ?? {}).map((size) => size.filename)].filter(Boolean);
        await r2.deleteKeys(names.map((name) => `${folder}/${name}`));
      }
    }
    return result;
  };
  return { ...db, r2 };
}

test("removes only the mock records, and only mock files from R2", async () => {
  const { payload, writes, collections, r2 } = world();
  const summary = await clearMockInstagram(payload, r2, { dryRun: false });

  assert.deepEqual(r2.listed, ["instagram/mock-", "instagram-videos/mock-"]);
  // Records' files (through Payload), then the one leftover.
  assert.deepEqual(r2.deleted, [
    "instagram-videos/mock-2-02.mp4",
    "instagram/mock-2-01.jpg",
    "instagram/mock-2-01-320x400.jpg",
    "instagram/mock-2-02.jpg",
    "instagram-videos/mock-2-09.mp4",
  ]);
  assert.ok(r2.deleted.every(isMockFileKey), "every removed file is a mock file");
  assert.deepEqual(r2.bucket, [
    "backstage/her-reel.mp4",
    "backstage/mock-2-02.mp4",
    "instagram/18622186981000665.jpg",
    "instagram-videos/17920807557125731.mp4",
    "instagram-videos/mock-../backstage/her-reel.mp4",
  ]);

  const deletes = writes.filter((w) => w.op === "delete").map((w) => [w.collection, w.ids]);
  assert.deepEqual(deletes, [
    ["instagram-videos", [202]],
    ["instagram-posts", [101, 102]],
    ["instagram-tokens", []],
    ["instagram-connections", [3]],
  ]);
  // Everything real is still there.
  assert.deepEqual(collections["instagram-posts"].map((p) => p.id), [61, 76]);
  assert.deepEqual(collections["instagram-videos"].map((v) => v.id), [201]);
  assert.deepEqual(collections["instagram-connections"].map((c) => c.id), [2]);
  assert.deepEqual(collections["instagram-tokens"].map((t) => t.id), [9]);
  assert.deepEqual(summary.connections, ["slot 2 (@hamlettvisuals.2)"]);
});

test("a mock video record pointing at any other file stops the whole cleanup before anything is deleted", async () => {
  for (const bad of [
    { id: 203, post: 101, isMock: true, filename: "her-reel.mp4", prefix: "instagram-videos" },
    { id: 204, post: 101, isMock: true, filename: "mock-2-01.mp4", prefix: "backstage" },
    { id: 205, post: 101, isMock: true, filename: "../backstage/her-reel.mp4", prefix: "instagram-videos" },
    // Not marked mock, but on a mock post: deleting the post would delete it.
    { id: 206, post: 101, isMock: false, filename: "17920807557125731.mp4", prefix: "instagram-videos" },
  ]) {
    const { payload, writes, r2 } = world({ extraVideos: [bad] });
    await assert.rejects(clearMockInstagram(payload, r2, { dryRun: false }), /Nothing was removed/, JSON.stringify(bad));
    assert.deepEqual(writes, [], JSON.stringify(bad));
    assert.deepEqual(r2.deleted, [], JSON.stringify(bad));
  }
});

test("a dry run deletes nothing, and lists the records' own files as theirs, not leftovers", async () => {
  const { payload, writes, r2 } = world();
  const summary = await clearMockInstagram(payload, r2, { dryRun: true });
  assert.deepEqual(writes, []);
  assert.deepEqual(r2.deleted, []);
  assert.deepEqual(summary.videos, ["mock-2-02.mp4"]);
  assert.deepEqual(summary.posts, ["mock-2-01", "mock-2-02"]);
  assert.deepEqual(summary.leftovers, ["instagram-videos/mock-2-09.mp4"]);
});
