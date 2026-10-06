import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getPayload } from "payload";
import config from "#src/payload.config.ts";
import { UPLOAD_FOLDERS, r2, r2Bucket } from "#src/lib/r2.ts";

// Removes everything the mock Instagram provider made (lib/instagram-mock-provider.ts)
// from the shared database and R2, for before launch:
//   npm run instagram:clear-mock            removes it
//   npm run instagram:clear-mock dry-run    only lists it
// A plain word, not "--dry-run": `payload run` passes a script its plain
// arguments only and silently drops anything starting with "-", so a
// "--dry-run" would run for real.
// Mock posts go through Payload's own delete, so their images (and
// thumbnails) leave R2 with them and they drop out of any featured picks;
// then the mock connections; then any mock image left in R2 without a post
// (a sync that failed halfway). Prints what it removed; with nothing to
// remove it changes nothing.

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "dry-run")) {
  console.error(`Unknown argument(s): ${args.join(" ")}. Use "dry-run" or nothing.`);
  process.exit(1);
}
const dryRun = args.includes("dry-run");
const verb = dryRun ? "Would remove" : "Removed";
const payload = await getPayload({ config });

const { docs: posts } = await payload.find({
  collection: "instagram-posts",
  where: { isMock: { equals: true } },
  select: { igId: true, filename: true },
  limit: 0,
  depth: 0,
});
const { docs: connections } = await payload.find({
  collection: "instagram-connections",
  where: { isMock: { equals: true } },
  select: { slot: true, username: true },
  limit: 0,
  depth: 0,
});

if (posts.length) {
  if (!dryRun) {
    await payload.delete({ collection: "instagram-posts", where: { id: { in: posts.map((p) => p.id) } }, depth: 0 });
  }
  console.log(`${verb} ${posts.length} mock post(s) and their images: ${posts.map((p) => p.igId).join(", ")}`);
}

if (connections.length) {
  if (!dryRun) {
    // Their tokens first (mock connections have none, but the token's
    // connection link is required).
    await payload.delete({ collection: "instagram-tokens", where: { connection: { in: connections.map((c) => c.id) } }, depth: 0 });
    await payload.delete({ collection: "instagram-connections", where: { id: { in: connections.map((c) => c.id) } }, depth: 0 });
  }
  console.log(`${verb} ${connections.length} mock connection(s): ${connections.map((c) => `slot ${c.slot} (@${c.username ?? "?"})`).join(", ")}`);
}

// Mock images are named after their mock post ids ("mock-1-01.jpg" and its
// sizes, "mock-1-01-320x400.jpg"), so anything left under that name belongs
// to no post.
const prefix = `${UPLOAD_FOLDERS["instagram-posts"]}/mock-`;
// On a dry run the posts above still exist, so their own images aren't
// leftovers.
const stems = posts.map((p) => `${UPLOAD_FOLDERS["instagram-posts"]}/${(p.filename ?? "").replace(/\.[^.]+$/, "")}`);
const belongsToPost = (key: string) => stems.some((stem) => key.startsWith(`${stem}.`) || key.startsWith(`${stem}-`));
const leftovers: string[] = [];
let token: string | undefined;
do {
  const page = await r2().send(new ListObjectsV2Command({ Bucket: r2Bucket(), Prefix: prefix, ContinuationToken: token }));
  for (const object of page.Contents ?? []) if (object.Key && !(dryRun && belongsToPost(object.Key))) leftovers.push(object.Key);
  token = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (token);
if (leftovers.length) {
  if (!dryRun) {
    for (let i = 0; i < leftovers.length; i += 1000) {
      await r2().send(
        new DeleteObjectsCommand({
          Bucket: r2Bucket(),
          Delete: { Objects: leftovers.slice(i, i + 1000).map((Key) => ({ Key })) },
        }),
      );
    }
  }
  console.log(`${verb} ${leftovers.length} leftover mock image(s) in R2: ${leftovers.join(", ")}`);
}

if (!posts.length && !connections.length && !leftovers.length) console.log("No mock Instagram data to remove.");
process.exit(0);
