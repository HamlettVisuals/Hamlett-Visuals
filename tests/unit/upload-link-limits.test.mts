// Each collection's own size cap on its signed upload links
// (lib/upload-link-limits.ts), offline (`npm run test:unit`): a file over
// the cap is refused before any link is made, in the same words as the
// save; one under it reaches the R2 plugin's handler with that cap as the
// limit it writes into the link; collections the browser never uploads to
// keep the global cap. The plugin's handler is a stand-in that records
// what it was given.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { limitUploadLinks, uploadLinkLimits, SIGNED_URL_PATH } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "upload-link-limits.ts")).href
);

const MB = 1024 * 1024;
const GLOBAL = 1024 * MB;

type Seen = { fileSize: number; body: unknown; user: unknown };

function setup() {
  const seen: Seen[] = [];
  const inner = async (req: { json: () => Promise<unknown>; payload: { config: { upload: { limits: { fileSize: number } } } }; user: unknown }) => {
    seen.push({ fileSize: req.payload.config.upload.limits.fileSize, body: await req.json(), user: req.user });
    return Response.json({ url: "https://r2.example/signed" });
  };
  const handler = limitUploadLinks(inner);
  const call = (body: Record<string, unknown>) =>
    handler({
      user: { id: 1 },
      json: async () => body,
      payload: { config: { upload: { limits: { fileSize: GLOBAL } } } },
    });
  return { seen, call };
}

test("a photo under its cap: the link carries the photo cap, not the global one", async () => {
  const { seen, call } = setup();
  const body = { collectionSlug: "photos", filesize: 10 * MB, mimeType: "image/jpeg" };
  await call(body);
  assert.equal(seen[0].fileSize, 50 * MB);
  assert.deepEqual(seen[0].body, body, "the plugin still reads the request");
  assert.deepEqual(seen[0].user, { id: 1 });
});

test("a photo over its cap is refused before a link is made", async () => {
  const { seen, call } = setup();
  await assert.rejects(call({ collectionSlug: "photos", filesize: 60 * MB, mimeType: "image/jpeg" }), {
    message: "That photo is 60MB. Photos can be up to 50MB.",
  });
  assert.equal(seen.length, 0);
});

test("logos and posters have their own caps", async () => {
  const { seen, call } = setup();
  await call({ collectionSlug: "logos", filesize: 1 * MB, mimeType: "image/png" });
  await call({ collectionSlug: "video-posters", filesize: 1 * MB, mimeType: "image/jpeg" });
  assert.deepEqual(seen.map((s) => s.fileSize), [5 * MB, 50 * MB]);
  await assert.rejects(call({ collectionSlug: "logos", filesize: 6 * MB, mimeType: "image/png" }), /Logos can be up to 5MB/);
});

test("Backstage: a video gets the video cap, a photo the photo cap", async () => {
  const { seen, call } = setup();
  await call({ collectionSlug: "backstage", filesize: 150 * MB, mimeType: "video/mp4" });
  await call({ collectionSlug: "backstage", filesize: 5 * MB, mimeType: "image/jpeg" });
  assert.deepEqual(seen.map((s) => s.fileSize), [200 * MB, 50 * MB]);
  await assert.rejects(call({ collectionSlug: "backstage", filesize: 60 * MB, mimeType: "image/jpeg" }), /Photos can be up to 50MB/);
});

test("album videos get 1GB, with the video refusal's own words over it", async () => {
  const { seen, call } = setup();
  await call({ collectionSlug: "videos", filesize: 900 * MB, mimeType: "video/mp4" });
  assert.equal(seen[0].fileSize, 1024 * MB);
  await assert.rejects(call({ collectionSlug: "videos", filesize: 1.3 * 1024 * MB, mimeType: "video/mp4" }), {
    message: "That video is 1.3GB. Videos can be up to 1GB. Your website preset keeps a 5-minute reel well under that.",
  });
});

test("a collection the browser never uploads to keeps the global cap", async () => {
  const { seen, call } = setup();
  await call({ collectionSlug: "instagram-videos", filesize: 10 * MB, mimeType: "video/mp4" });
  assert.equal(seen[0].fileSize, GLOBAL);
});

test("the plugin wraps the R2 plugin's endpoint, and says so if it's missing", () => {
  const original = async () => Response.json({});
  const config = { endpoints: [{ path: SIGNED_URL_PATH, method: "post", handler: original }] };
  uploadLinkLimits(config);
  assert.notEqual(config.endpoints[0].handler, original);
  assert.throws(() => uploadLinkLimits({ endpoints: [] }), /no \/storage-s3-generate-signed-url endpoint/);
});
