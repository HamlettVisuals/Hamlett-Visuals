// The Testimonials admin's rules that don't need a database, offline
// (`npm run test:unit`): the homepage picks a testimonial's "Show on
// homepage" adds or removes (lib/testimonial-homepage.ts), the quote-font
// fallback (lib/quote-font-options.ts) and the order within a category
// (lib/manual-order.ts compareTestimonials).
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lib = (name: string) => pathToFileURL(path.join(ROOT, "src", "lib", name)).href;
const { nextPicks } = await import(lib("testimonial-homepage.ts"));
const { resolveQuoteFont, validateQuoteFont } = await import(lib("quote-font-options.ts"));
const { compareTestimonials } = await import(lib("manual-order.ts"));

test("adding goes at the end and keeps the section's order", () => {
  assert.deepEqual(nextPicks([3, 1], 7, true, { published: true }), [3, 1, 7]);
});

test("removing takes out just that one, in place", () => {
  assert.deepEqual(nextPicks([3, 7, 1], 7, false, { published: true }), [3, 1]);
});

test("no change returns the same list, so nothing is saved", () => {
  const picks = [3, 1];
  assert.equal(nextPicks(picks, 3, true, { published: true }), picks);
  assert.equal(nextPicks(picks, 9, false, { published: false }), picks);
});

test("a fifth pick is refused with a clear message", () => {
  assert.throws(() => nextPicks([1, 2, 3, 4], 5, true, { published: true }), /already shows 4 testimonials/);
});

test("a hidden testimonial can't be added, but can always be removed", () => {
  assert.throws(() => nextPicks([1], 5, true, { published: false }), /Publish this testimonial/);
  assert.deepEqual(nextPicks([1, 5], 5, false, { published: false }), [1]);
});

test("an unknown or removed font key falls back to the default", () => {
  assert.equal(resolveQuoteFont("petrona", "lora"), "petrona");
  assert.equal(resolveQuoteFont("comic-sans", "lora"), "lora");
  assert.equal(resolveQuoteFont(null, "fraunces-upright"), "fraunces-upright");
  assert.equal(validateQuoteFont("lora"), true);
  assert.match(String(validateQuoteFont("comic-sans")), /Choose one/);
});

test("testimonials sort by her order; ones without a key go on top, newest first", () => {
  const rows = [
    { id: 1, listOrder: "a1", createdAt: "2026-01-01" },
    { id: 2, listOrder: "a0", createdAt: "2026-01-02" },
    { id: 3, listOrder: null, createdAt: "2026-02-01" },
    { id: 4, listOrder: null, createdAt: "2026-03-01" },
  ];
  assert.deepEqual(rows.toSorted(compareTestimonials).map((r) => r.id), [4, 3, 2, 1]);
});

// ---- category follows the album (collections/Testimonials.ts) ----------
const { validateCategory } = await import(pathToFileURL(path.join(ROOT, "src", "collections", "Testimonials.ts")).href);

// A stand-in for Payload: albums 16 (in Test, 27) and 18 (in Motorsports, 26).
const EVENTS: Record<number, { id: number; category: { id: number; name: string } }> = {
  16: { id: 16, category: { id: 27, name: "Test" } },
  18: { id: 18, category: { id: 26, name: "Motorsports" } },
};
const req = {
  payload: {
    findByID: async ({ id }: { id: number }) => {
      if (!EVENTS[id]) throw new Error("not found");
      return EVENTS[id];
    },
  },
};
const check = (category: unknown, data: Record<string, unknown>) => validateCategory(category, { data, req });

test("with an album, the category has to be the album's", async () => {
  assert.equal(await check(27, { event: 16 }), true);
  assert.match(String(await check(11, { event: 16 })), /This album is in Test, so the category has to be Test/);
  assert.equal(await check({ id: 26 }, { event: { id: 18 } }), true);
});

test("without an album, any category will do", async () => {
  assert.equal(await check(11, { event: null }), true);
});

test("a category is required, except on a hidden client submission", async () => {
  assert.match(String(await check(null, { source: "admin", published: true })), /Choose a category/);
  assert.match(String(await check(null, { source: "client", published: true })), /Choose a category/);
  assert.equal(await check(null, { source: "client", published: false }), true);
});
