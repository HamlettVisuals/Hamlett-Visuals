import path from "node:path";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { UPLOAD_FOLDERS } from "#src/lib/upload-folders.ts";

// The R2 bucket every upload lives in, for the few things done with it
// outside Payload's storage plugin: removing a refused browser upload
// (upload-limits.ts), fetching a Backstage video for ffmpeg
// (backstage-media.ts) and the public testimonial form's holding spot
// (testimonial-uploads.ts). The same bucket and credentials as
// payload.config.ts's s3Storage().
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only — see the note at the top of that file.

let client: S3Client | null = null;
export function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
  return client;
}

export const r2Bucket = () => process.env.R2_BUCKET ?? "";

export { UPLOAD_FOLDERS };

// A stored file's key: its folder, then its file name.
export const storedFileKey = (prefix: string | null | undefined, filename: string) =>
  path.posix.join(prefix ?? "", filename);

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }));
}
