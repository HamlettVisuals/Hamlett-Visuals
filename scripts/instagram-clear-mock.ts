import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getPayload } from "payload";
import config from "#src/payload.config.ts";
import { clearMockInstagram } from "#src/lib/instagram-mock-cleanup.ts";
import { r2, r2Bucket } from "#src/lib/r2.ts";

// Removes everything the mock Instagram provider made (lib/instagram-mock-provider.ts)
// from the shared database and R2, for before launch:
//   npm run instagram:clear-mock            removes it
//   npm run instagram:clear-mock dry-run    only lists it
// A plain word, not "--dry-run": `payload run` passes a script its plain
// arguments only and silently drops anything starting with "-", so a
// "--dry-run" would run for real.
// What it removes, and the checks that keep it to mock files only:
// lib/instagram-mock-cleanup.ts. Mock videos and posts go through
// Payload's own delete, so their files (and thumbnails) leave R2 with them
// and they drop out of any featured picks; then the mock connections; then
// any mock file left in R2 without a record. With nothing to remove it
// changes nothing.

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "dry-run")) {
  console.error(`Unknown argument(s): ${args.join(" ")}. Use "dry-run" or nothing.`);
  process.exit(1);
}
const dryRun = args.includes("dry-run");
const verb = dryRun ? "Would remove" : "Removed";
const payload = await getPayload({ config });

const summary = await clearMockInstagram(
  payload,
  {
    async listKeys(prefix) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const page = await r2().send(new ListObjectsV2Command({ Bucket: r2Bucket(), Prefix: prefix, ContinuationToken: token }));
        for (const object of page.Contents ?? []) if (object.Key) keys.push(object.Key);
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return keys;
    },
    async deleteKeys(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        await r2().send(
          new DeleteObjectsCommand({ Bucket: r2Bucket(), Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) } }),
        );
      }
    },
  },
  { dryRun },
).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

if (summary.videos.length) console.log(`${verb} ${summary.videos.length} mock video(s) and their files: ${summary.videos.join(", ")}`);
if (summary.posts.length) console.log(`${verb} ${summary.posts.length} mock post(s) and their images: ${summary.posts.join(", ")}`);
if (summary.connections.length) console.log(`${verb} ${summary.connections.length} mock connection(s): ${summary.connections.join(", ")}`);
if (summary.leftovers.length) {
  console.log(`${verb} ${summary.leftovers.length} leftover mock file(s) in R2: ${summary.leftovers.join(", ")}`);
}
if (!summary.videos.length && !summary.posts.length && !summary.connections.length && !summary.leftovers.length) {
  console.log("No mock Instagram data to remove.");
}
process.exit(0);
