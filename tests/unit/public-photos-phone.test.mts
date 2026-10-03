// Two signed-out read rules, offline (`npm run test:unit`), with a stand-in
// for Payload (no database):
//   - which photos the site shows besides album photos
//     (lib/photo-usage.ts collectShownPhotoIds) and the photo query built
//     from it (lib/public-photos.ts publicPhotoWhere);
//   - whether the contact phone shows anywhere (lib/phone-shown.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lib = (name: string) => pathToFileURL(path.join(ROOT, "src", "lib", name)).href;
const { collectShownPhotoIds } = await import(lib("photo-usage.ts"));
const { publicPhotoWhere, forgetShownPhotos } = await import(lib("public-photos.ts"));
const { phoneShown } = await import(lib("phone-shown.ts"));

// A small site: two categories (one hidden), an album in each, a testimonial
// shown and one hidden, and About's portrait. Photo ids say what they are.
const upload = (name: string, extra: Record<string, unknown> = {}) => ({ name, type: "upload", relationTo: "photos", ...extra });
const config = {
  collections: [
    { slug: "photos", flattenedFields: [] },
    { slug: "categories", trash: true, flattenedFields: [{ name: "published", type: "checkbox" }, upload("coverPhoto")] },
    {
      slug: "events",
      trash: true,
      flattenedFields: [{ name: "published", type: "checkbox" }, { name: "category", type: "relationship", relationTo: "categories" }],
    },
    {
      slug: "testimonials",
      trash: true,
      flattenedFields: [{ name: "published", type: "checkbox" }, upload("photo"), upload("oldPhoto", { admin: { hidden: true } })],
    },
  ],
  globals: [{ slug: "about", flattenedFields: [upload("portrait")] }],
};
const DOCS: Record<string, Record<string, unknown>[]> = {
  categories: [
    { id: 1, published: true, coverPhoto: 101 }, // a shown category's cover
    { id: 2, published: false, coverPhoto: 102 }, // a hidden category's cover
  ],
  events: [],
  testimonials: [
    { id: 1, published: true, photo: 201, oldPhoto: 203 }, // shown; its retired field doesn't count
    { id: 2, published: false, photo: 202 }, // hidden
  ],
};
let queries = 0;
const req = {
  payload: {
    config,
    find: async ({ collection }: { collection: string }) => {
      queries++;
      return { docs: DOCS[collection] ?? [] };
    },
    findGlobal: async () => {
      queries++;
      return { portrait: 301 };
    },
  },
};

test("photos the site shows outside albums: shown documents and globals, not hidden or retired ones", async () => {
  const ids = [...(await collectShownPhotoIds(req))].sort();
  assert.deepEqual(ids, [101, 201, 301]);
});

test("the photo query: not trashed, and in no album, in a shown album, or used by something shown", async () => {
  forgetShownPhotos();
  const where = JSON.stringify(await publicPhotoWhere(req));
  assert.match(where, /"deletedAt":\{"exists":false\}/);
  assert.match(where, /"event":\{"exists":false\}/);
  assert.match(where, /"event\.published":\{"equals":true\}/);
  assert.match(where, /"event\.category\.published":\{"equals":true\}/);
  assert.match(where, /"event\.category\.deletedAt":\{"exists":false\}/);
  assert.match(where, /"id":\{"in":\[(101,201,301|[0-9,]+)\]\}/);
});

test("the used-by list is worked out once and reused until the site changes", async () => {
  forgetShownPhotos();
  await publicPhotoWhere(req);
  const after = queries;
  await publicPhotoWhere(req);
  await publicPhotoWhere(req);
  assert.equal(queries, after, "no new queries while cached");
  forgetShownPhotos();
  await publicPhotoWhere(req);
  assert.ok(queries > after, "a change makes it look again");
});

test("the phone shows unless every place has it switched off", () => {
  assert.equal(phoneShown({ showPhone: true }, { showPhone: true }), true);
  assert.equal(phoneShown({ showPhone: false }, { showPhone: true }), true);
  assert.equal(phoneShown({ showPhone: true }, { showPhone: false }), true);
  assert.equal(phoneShown({ showPhone: false }, { showPhone: false }), false);
  // Never set means on (older saves have no value).
  assert.equal(phoneShown({}, null), true);
});
