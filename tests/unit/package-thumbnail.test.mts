// The Packages list's photo (components/admin/PackageThumbnailCell.tsx),
// offline (`npm run test:unit`): the cover photo of the package's
// category, or the muted placeholder when the category has none (or it's
// in the Trash, or there's no category). Rendered to HTML against a
// stand-in for Payload; no database, no sign-in. The .tsx file is compiled
// with esbuild (already installed) into node_modules/.cache, where React
// resolves as usual.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { transformSync } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = path.join(ROOT, "src", "components", "admin", "PackageThumbnailCell.tsx");
const { code } = transformSync(readFileSync(source, "utf8"), { loader: "tsx", jsx: "automatic", format: "esm" });
const outDir = path.join(ROOT, "node_modules", ".cache", "unit-tests");
mkdirSync(outDir, { recursive: true });
const compiled = path.join(outDir, "PackageThumbnailCell.mjs");
writeFileSync(compiled, code);
const { default: PackageThumbnailCell } = await import(pathToFileURL(compiled).href);

// Categories by id, as findByID would return them at depth 1.
function standIn(categories: Record<number, any>) {
  const asked: any[] = [];
  return {
    asked,
    payload: {
      findByID: async (args: any) => {
        asked.push(args);
        return categories[args.id] ?? null;
      },
    },
  };
}

const render = async (rowData: any, categories: Record<number, any>) => {
  const { payload, asked } = standIn(categories);
  const html = renderToStaticMarkup(await PackageThumbnailCell({ payload, rowData } as never));
  return { html, asked };
};

const cover = { id: 3, url: "https://media.test/full.jpg", alt: "Bride", sizes: { thumbnail: { url: "https://media.test/thumb.jpg" } } };

test("the category's cover photo, as a thumbnail", async () => {
  const { html, asked } = await render({ id: 1, category: 5 }, { 5: { id: 5, name: "Weddings", coverPhoto: cover } });
  assert.match(html, /<img[^>]+class="category-thumb"[^>]+src="https:\/\/media.test\/thumb.jpg"[^>]+alt="Bride"/);
  // Asks for the category, its photo's thumbnail, and trashed categories too.
  assert.equal(asked[0].collection, "categories");
  assert.equal(asked[0].id, 5);
  assert.equal(asked[0].trash, true);
  assert.ok(asked[0].populate.photos.sizes.thumbnail);
});

test("a populated category on the row works the same", async () => {
  const { html } = await render({ id: 1, category: { id: 5, name: "Weddings" } }, { 5: { id: 5, name: "Weddings", coverPhoto: cover } });
  assert.match(html, /thumb\.jpg/);
});

test("no thumbnail size: the full photo", async () => {
  const { html } = await render({ id: 1, category: 5 }, { 5: { id: 5, name: "Weddings", coverPhoto: { ...cover, sizes: {} } } });
  assert.match(html, /src="https:\/\/media.test\/full.jpg"/);
});

test("no cover photo: muted placeholder, named", async () => {
  const { html } = await render({ id: 1, category: 6 }, { 6: { id: 6, name: "Real Estate", coverPhoto: null } });
  assert.match(html, /<span class="category-thumb category-thumb--empty" aria-label="No cover photo for Real Estate"/);
  assert.doesNotMatch(html, /<img/);
});

test("cover photo in the Trash (populates as null): placeholder", async () => {
  const { html } = await render({ id: 1, category: 6 }, { 6: { id: 6, name: "Real Estate", coverPhoto: 44 } });
  assert.match(html, /category-thumb--empty/);
});

test("no category: placeholder, no lookup", async () => {
  const { html, asked } = await render({ id: 1, category: null }, {});
  assert.match(html, /aria-label="No category"/);
  assert.equal(asked.length, 0);
});

test("two packages in one category show the same cover", async () => {
  const categories = { 5: { id: 5, name: "Weddings", coverPhoto: cover } };
  const a = await render({ id: 1, category: 5 }, categories);
  const b = await render({ id: 2, category: 5 }, categories);
  assert.equal(a.html, b.html);
});
