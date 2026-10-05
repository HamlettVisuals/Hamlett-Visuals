// Ending studio logins (lib/user-sessions.ts), offline (`npm run test:unit`):
// which sessions survive a password change, and reading the session id out
// of a freshly signed token.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { sessionsAfterPasswordChange, sessionIdFromToken } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "user-sessions.ts")).href
);

const sessions = [{ id: "phone" }, { id: "laptop" }, { id: "tablet" }];

test("a password change keeps only the device that made it", () => {
  assert.deepEqual(sessionsAfterPasswordChange(sessions, "laptop"), [{ id: "laptop" }]);
});

test("with no device to keep (a change made by someone else, or a script), every session ends", () => {
  assert.deepEqual(sessionsAfterPasswordChange(sessions, null), []);
  assert.deepEqual(sessionsAfterPasswordChange(sessions, "unknown"), []);
});

test("no sessions stays no sessions", () => {
  assert.deepEqual(sessionsAfterPasswordChange(undefined, "laptop"), []);
});

test("the session id comes out of the token; anything else gives none", () => {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  assert.equal(sessionIdFromToken(`${part({ alg: "HS256" })}.${part({ id: 1, sid: "abc-123" })}.sig`), "abc-123");
  assert.equal(sessionIdFromToken(`${part({ alg: "HS256" })}.${part({ id: 1 })}.sig`), null);
  assert.equal(sessionIdFromToken("not-a-token"), null);
  assert.equal(sessionIdFromToken(undefined), null);
});
