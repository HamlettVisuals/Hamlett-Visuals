// What a signed-out visitor may read through the API
// (src/access/publicRead.ts), offline (`npm run test:unit`): signed in,
// everything; signed out, only what the site shows, never the Trash.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { readPublished, readPublishedInShownCategory, studioOnlyField } = await import(
  pathToFileURL(path.join(ROOT, "src", "access", "publicRead.ts")).href
);

const signedIn = { req: { user: { id: 1 } } };
const signedOut = { req: { user: null } };
const flat = (where: unknown) => JSON.stringify(where);

test("signed in, everything", () => {
  assert.equal(readPublished(signedIn), true);
  assert.equal(readPublishedInShownCategory(signedIn), true);
  assert.equal(studioOnlyField(signedIn), true);
});

test("signed out, published and not in the Trash", () => {
  const where = flat(readPublished(signedOut));
  assert.match(where, /"published":\{"equals":true\}/);
  assert.match(where, /"deletedAt":\{"exists":false\}/);
});

test("signed out, albums and packages also need their category shown", () => {
  const where = flat(readPublishedInShownCategory(signedOut));
  assert.match(where, /"published":\{"equals":true\}/);
  assert.match(where, /"deletedAt":\{"exists":false\}/);
  assert.match(where, /"category\.published":\{"equals":true\}/);
  assert.match(where, /"category\.deletedAt":\{"exists":false\}/);
});

test("studio-only fields are left out signed out", () => {
  assert.equal(studioOnlyField(signedOut), false);
});
