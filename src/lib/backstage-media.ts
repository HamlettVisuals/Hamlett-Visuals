import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Server-side video helpers for Backstage (collections/Backstage.ts): how
// long a clip is, and a still frame to use as its thumbnail. Both run the
// ffmpeg binary that ships with the `ffmpeg-static` package, so it works
// the same on this machine and on Vercel (see next.config.ts for why it's
// kept out of the bundle and traced in by hand).
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only (here: none) — see the note at the top of that file.

// Resolved at call time, and through createRequire rather than an import,
// so the bundler leaves the package (and the path it computes from its own
// folder) alone.
function ffmpegPath(): string {
  const resolved = createRequire(import.meta.url)("ffmpeg-static") as string | null;
  if (!resolved) throw new Error("ffmpeg-static has no binary for this platform.");
  return resolved;
}

function runFfmpeg(args: string[]) {
  return new Promise<{ stdout: Buffer; stderr: string; failed: boolean }>((resolve) => {
    execFile(
      ffmpegPath(),
      args,
      { encoding: "buffer", maxBuffer: 32 * 1024 * 1024, timeout: 60_000, windowsHide: true },
      (error, stdout, stderr) => {
        resolve({ stdout, stderr: stderr.toString("utf8"), failed: Boolean(error) });
      },
    );
  });
}

// Seconds, from the "Duration: 00:01:02.35" line ffmpeg prints for its
// input. null when ffmpeg can't read the file as a video.
export async function probeDuration(filePath: string): Promise<number | null> {
  const { stderr } = await runFfmpeg(["-hide_banner", "-i", filePath]);
  const match = stderr.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

// A JPEG of one frame, at most 1080px on its long side. Taken a second in
// (or a tenth of the way into a very short clip) so it isn't the black or
// half-faded first frame most clips open on. Falls back to the first frame
// if seeking fails. ffmpeg applies the phone's rotation flag itself.
export async function extractFrame(filePath: string, durationSeconds: number | null): Promise<Buffer | null> {
  const at = durationSeconds && durationSeconds < 10 ? durationSeconds / 10 : 1;
  const scale = "scale='if(gt(iw,ih),min(1080,iw),-2)':'if(gt(iw,ih),-2,min(1080,ih))'";
  for (const seek of [at, 0]) {
    const { stdout, failed } = await runFfmpeg([
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(seek),
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-vf",
      scale,
      "-q:v",
      "3",
      "-f",
      "image2",
      "-c:v",
      "mjpeg",
      "pipe:1",
    ]);
    if (!failed && stdout.length > 0) return stdout;
  }
  return null;
}

// The same bucket and credentials as payload.config.ts's s3Storage().
let client: S3Client | null = null;
function r2(): S3Client {
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

// Copies a stored Backstage file to a temp file for ffmpeg, e.g. to
// re-make a thumbnail after she removes her own. Backstage files have no
// prefix in the bucket, so the key is the filename.
export async function downloadToTemp(filename: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), `backstage-${randomUUID()}${path.extname(filename)}`);
  const { Body } = await r2().send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: filename }));
  if (!Body) throw new Error(`No file in storage for ${filename}.`);
  await pipeline(Body as Readable, createWriteStream(tempPath));
  return tempPath;
}

// A file uploaded straight from the browser is already in R2 before the
// save runs, so a save that's refused (too big, too long) has to remove it
// again or it would sit there unused.
export async function deleteStoredFile(filename: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: filename }));
}

// The incoming upload as a file on disk: a browser upload has already been
// downloaded to one by Payload; a server upload is in memory.
export async function incomingFileOnDisk(file: {
  data: Buffer;
  name: string;
  tempFilePath?: string;
}): Promise<{ path: string; cleanup: () => Promise<void> }> {
  if (file.tempFilePath) return { path: file.tempFilePath, cleanup: async () => {} };
  const tempPath = path.join(os.tmpdir(), `backstage-${randomUUID()}${path.extname(file.name)}`);
  await writeFile(tempPath, file.data);
  return { path: tempPath, cleanup: () => rm(tempPath, { force: true }) };
}

export const removeTemp = (filePath: string) => rm(filePath, { force: true });
