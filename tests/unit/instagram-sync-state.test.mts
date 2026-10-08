// What the studio card says about an account's last sync, offline
// (`npm run test:unit`): "last synced" only for a sync that worked, a failed
// sync as an error rather than an old success time, and a real connect never
// keeping a mock connection's (or another account's) last sync time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { syncState, realConnectionUpdate } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "instagram-connection.ts")).href
);

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 8, 12, minutes)).toISOString();

// ---- syncState

test("never synced, nothing wrong: never", () => {
  assert.equal(syncState({ lastSyncedAt: null, lastError: null, updatedAt: at(0) }), "never");
});

test("a sync that worked: ok", () => {
  assert.equal(syncState({ lastSyncedAt: at(0), lastError: null, updatedAt: at(0) }), "ok");
});

test("a first sync that failed (no successful one yet): failed", () => {
  assert.equal(syncState({ lastSyncedAt: null, lastError: "Missing permission", updatedAt: at(5) }), "failed");
});

test("a sync that failed after an earlier one worked: failed, not the old success", () => {
  assert.equal(syncState({ lastSyncedAt: at(0), lastError: "Missing permission", updatedAt: at(60) }), "failed");
});

test("a sync that worked but couldn't save some posts (same write): partial", () => {
  const synced = new Date(Date.UTC(2026, 9, 8, 12, 0, 0, 0)).toISOString();
  const written = new Date(Date.UTC(2026, 9, 8, 12, 0, 0, 40)).toISOString();
  assert.equal(syncState({ lastSyncedAt: synced, lastError: "2 post(s) couldn't be saved", updatedAt: written }), "partial");
});

test("an error with no update time to compare against counts as failed", () => {
  assert.equal(syncState({ lastSyncedAt: at(0), lastError: "x" }), "failed");
});

// ---- realConnectionUpdate

const account = { igUserId: "ig-real", username: "hamlettvisuals" };

test("connecting over a mock connection clears its last sync time", () => {
  const { data, switched } = realConnectionUpdate({ isMock: true, igUserId: "mock-1" }, account);
  assert.equal(switched, false);
  assert.equal(data.lastSyncedAt, null);
  assert.equal(data.isMock, false);
  assert.equal(data.status, "connected");
  assert.equal(data.lastError, null);
});

test("connecting a slot with no connection, or one that never connected, starts with no sync time", () => {
  assert.equal(realConnectionUpdate(undefined, account).data.lastSyncedAt, null);
  assert.equal(realConnectionUpdate({ isMock: false, igUserId: null }, account).data.lastSyncedAt, null);
});

test("switching to a different real account clears the sync time and says so", () => {
  const { data, switched } = realConnectionUpdate({ isMock: false, igUserId: "ig-other" }, account);
  assert.equal(switched, true);
  assert.equal(data.lastSyncedAt, null);
});

test("reconnecting the same real account keeps its last sync time", () => {
  const { data, switched } = realConnectionUpdate({ isMock: false, igUserId: "ig-real" }, account);
  assert.equal(switched, false);
  assert.equal("lastSyncedAt" in data, false);
  assert.equal(data.username, "hamlettvisuals");
});
