// The homepage Instagram section's post selection and layout
// (lib/instagram-layout.ts), offline (`npm run test:unit`): featured picks
// first in her order, then the most recent; 9 for one account, 6 + 6 for
// two; accounts that are off, not connected or empty are left out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { selectPosts, layoutFor, SINGLE_ACCOUNT_POSTS, BOTH_ACCOUNTS_POSTS } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "instagram-layout.ts")).href
);

const posts = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}` }));
const ids = (list: { id: string }[]) => list.map((p) => p.id);
const recent = posts("r", 20); // newest first

test("no picks: the most recent posts, newest first", () => {
  assert.deepEqual(ids(selectPosts([], recent, 9)), ids(recent.slice(0, 9)));
});

test("picks first in her order, then the most recent", () => {
  const featured = [{ id: "r15" }, { id: "r12" }];
  assert.deepEqual(ids(selectPosts(featured, recent, 5)), ["r15", "r12", "r1", "r2", "r3"]);
});

test("a pick that's also recent isn't shown twice", () => {
  const featured = [{ id: "r2" }, { id: "r1" }];
  assert.deepEqual(ids(selectPosts(featured, recent, 4)), ["r2", "r1", "r3", "r4"]);
});

test("more picks than slots: only the first picks, in order", () => {
  const featured = posts("f", 9);
  assert.deepEqual(ids(selectPosts(featured, recent, 6)), ["f1", "f2", "f3", "f4", "f5", "f6"]);
});

test("fewer posts than slots: what there is, no padding", () => {
  assert.deepEqual(ids(selectPosts([], posts("r", 4), 9)), ["r1", "r2", "r3", "r4"]);
});

test("ids match across numbers and strings", () => {
  assert.deepEqual(ids(selectPosts([{ id: 3 }], [{ id: "3" }, { id: 4 }], 9) as never), [3, 4]);
});

const account = (slot: number, over: Record<string, unknown> = {}) => ({
  slot,
  handle: `@acct${slot}`,
  label: `Label ${slot}`,
  connected: true,
  visible: true,
  featured: [],
  recent: posts(`s${slot}-`, 20),
  ...over,
});

test("one account shown: a single grid of 9", () => {
  const layout = layoutFor([account(1), account(2, { visible: false })]);
  assert.equal(layout.kind, "single");
  assert.equal(layout.block.slot, 1);
  assert.equal(layout.block.posts.length, SINGLE_ACCOUNT_POSTS);
  assert.equal(SINGLE_ACCOUNT_POSTS, 9);
});

test("both shown: two blocks of 6, slot 1 first", () => {
  const layout = layoutFor([account(2), account(1)]);
  assert.equal(layout.kind, "pair");
  assert.deepEqual(layout.blocks.map((b: { slot: number }) => b.slot), [1, 2]);
  for (const block of layout.blocks) assert.equal(block.posts.length, BOTH_ACCOUNTS_POSTS);
  assert.equal(BOTH_ACCOUNTS_POSTS, 6);
  assert.equal(layout.blocks[0].label, "Label 1");
  assert.equal(layout.blocks[1].handle, "@acct2");
});

test("both shown with 9 picks: the first 6 picks", () => {
  const layout = layoutFor([account(1, { featured: posts("f", 9) }), account(2)]);
  assert.deepEqual(ids(layout.blocks[0].posts), ["f1", "f2", "f3", "f4", "f5", "f6"]);
});

test("one shown with 9 picks: all 9 picks, no recent", () => {
  const layout = layoutFor([account(1, { featured: posts("f", 9) }), account(2, { visible: false })]);
  assert.deepEqual(ids(layout.block.posts), ids(posts("f", 9)));
});

test("Visible is ignored while an account isn't connected", () => {
  const layout = layoutFor([account(1), account(2, { connected: false })]);
  assert.equal(layout.kind, "single");
  assert.equal(layout.block.slot, 1);
});

test("an account with nothing synced is left out; the other gets the full grid", () => {
  const layout = layoutFor([account(1, { recent: [] }), account(2)]);
  assert.equal(layout.kind, "single");
  assert.equal(layout.block.slot, 2);
  assert.equal(layout.block.posts.length, 9);
});

test("nothing connected, switched on and synced: no grid", () => {
  assert.equal(layoutFor([account(1, { visible: false }), account(2, { connected: false })]).kind, "none");
  assert.equal(layoutFor([account(1, { recent: [] }), account(2, { recent: [] })]).kind, "none");
  assert.equal(layoutFor([]).kind, "none");
});
