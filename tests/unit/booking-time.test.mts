// The booking form's preferred time and Instagram handle (lib/booking-time.ts),
// offline (`npm run test:unit`): one list of times for the form, the Inquiry
// field and the studio, and the handle stored the way she'd want to read it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { PREFERRED_TIMES, isPreferredTime, preferredTimeLabel, normalizeHandle, instagramProfileUrl } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "booking-time.ts")).href
);

test("three times of day; anything else is no preference", () => {
  assert.deepEqual(PREFERRED_TIMES.map((t: { value: string }) => t.value), ["morning", "afternoon", "evening"]);
  assert.equal(isPreferredTime("evening"), true);
  assert.equal(isPreferredTime("midnight"), false);
  assert.equal(isPreferredTime(""), false);
  assert.equal(preferredTimeLabel("afternoon"), "Afternoon");
  assert.equal(preferredTimeLabel(null), null);
});

test("a handle gets one leading @, no spaces; blank is none", () => {
  assert.equal(normalizeHandle("janedoe"), "@janedoe");
  assert.equal(normalizeHandle("  @@jane doe "), "@janedoe");
  assert.equal(normalizeHandle("   "), null);
  assert.equal(normalizeHandle(undefined), null);
  assert.equal(instagramProfileUrl("@janedoe"), "https://www.instagram.com/janedoe/");
});
