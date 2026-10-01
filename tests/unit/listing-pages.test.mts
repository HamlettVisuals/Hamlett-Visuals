// The rule that hides an About quick link while its page is empty
// (lib/listing-pages.ts), offline (`npm run test:unit`): a page counts as
// empty when nothing on it is published, and comes back as soon as one
// thing is. Uses a stand-in for Payload's count; no database, no sign-in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { emptyListingPages, LISTING_PAGES } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "listing-pages.ts")).href
);

// Counts per collection; records what was asked.
function standIn(counts: Record<string, number>) {
  const asked: { collection: string; where: any }[] = [];
  const payload = {
    count: async ({ collection, where }: { collection: string; where: any }) => {
      asked.push({ collection, where });
      return { totalDocs: counts[collection] ?? 0 };
    },
  };
  return { payload, asked };
}

test("both pages empty: both links hidden", async () => {
  const { payload } = standIn({ backstage: 0, testimonials: 0 });
  assert.deepEqual((await emptyListingPages(payload as never)).sort(), ["/backstage", "/testimonials"]);
});

test("one thing published: that link comes back", async () => {
  const { payload } = standIn({ backstage: 1, testimonials: 0 });
  assert.deepEqual(await emptyListingPages(payload as never), ["/testimonials"]);
});

test("both have content: nothing hidden", async () => {
  const { payload } = standIn({ backstage: 3, testimonials: 2 });
  assert.deepEqual(await emptyListingPages(payload as never), []);
});

test("counts what each page shows", async () => {
  const { payload, asked } = standIn({});
  await emptyListingPages(payload as never);
  const by = Object.fromEntries(asked.map((a) => [a.collection, a.where]));
  // Backstage page: published items.
  assert.deepEqual(by.backstage, { published: { equals: true } });
  // Testimonials page: published ones with a category (it groups by category).
  assert.deepEqual(by.testimonials, { and: [{ published: { equals: true } }, { category: { exists: true } }] });
  assert.deepEqual(Object.keys(LISTING_PAGES).sort(), ["/backstage", "/testimonials"]);
});
