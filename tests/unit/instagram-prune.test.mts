// Which synced Instagram posts the sync deletes (lib/instagram-prune.ts),
// offline (`npm run test:unit`): the latest N per account stay, plus
// anything featured however old.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { postsToPrune, KEEP_PER_ACCOUNT } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "instagram-prune.ts")).href
);

// id n was posted n days ago, listed out of order.
const posts = [3, 1, 5, 2, 4].map((n) => ({ id: n, postedAt: new Date(Date.UTC(2026, 9, 10 - n)).toISOString() }));

test("keeps the most recent and deletes the rest, oldest included", () => {
  assert.deepEqual(postsToPrune(posts, [], 3).sort(), [4, 5]);
});

test("a featured post is kept however old", () => {
  assert.deepEqual(postsToPrune(posts, [5], 3), [4]);
});

test("featured ids match whether they're numbers or strings", () => {
  assert.deepEqual(postsToPrune(posts, ["4", "5"], 3), []);
});

test("nothing to delete under the limit", () => {
  assert.deepEqual(postsToPrune(posts, []), []);
  assert.equal(KEEP_PER_ACCOUNT, 50);
});
