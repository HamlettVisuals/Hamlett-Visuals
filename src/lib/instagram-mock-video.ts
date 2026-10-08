import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

// The mock provider's video file (lib/instagram-mock-provider.ts): a short
// test-pattern clip made here with ffmpeg (the `ffmpeg-static` binary, as
// for Backstage thumbnails), never a copy of any file already in the
// bucket. Each mock video is then saved as its own file under the mock
// names (InstagramVideos.ts), so deleting mock videos can only ever remove
// these clips. Made once per server process.

const SECONDS = 4;

let clip: Promise<Buffer> | null = null;

export function mockVideoClip(): Promise<Buffer> {
  clip ??= makeClip().catch((err) => {
    clip = null;
    throw err;
  });
  return clip;
}

async function makeClip(): Promise<Buffer> {
  const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string | null;
  if (!ffmpeg) throw new Error("ffmpeg-static has no binary for this platform.");
  const dir = await mkdtemp(path.join(tmpdir(), "hv-mock-video-"));
  const out = path.join(dir, "mock.mp4");
  try {
    await new Promise<void>((resolve, reject) =>
      execFile(
        ffmpeg,
        [
          "-f", "lavfi",
          "-i", `testsrc2=size=480x600:rate=24:duration=${SECONDS}`,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          "-an",
          "-y", out,
        ],
        { timeout: 60_000, windowsHide: true },
        (error, _stdout, stderr) => (error ? reject(new Error(`ffmpeg couldn't make the mock video: ${String(stderr).slice(-300)}`)) : resolve()),
      ),
    );
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
