// Reading an album video in place (lib/album-video-media.ts), offline
// (`npm run test:unit`): the MP4 box walk (real MP4 vs renamed QuickTime,
// fast start or not), ffmpeg's codec, size, length and rotation, and the
// loopback server ffmpeg reads through, with its byte ranges. The clips
// are made here with the ffmpeg that ships with ffmpeg-static, and served
// from local files instead of R2.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { readMp4Layout, parseVideoProbe, parseRange, serveOnLoopback, inspectVideo } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "album-video-media.ts")).href
);
const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;

let dir = "";
const clip = (name: string) => path.join(dir, name);

function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    execFile(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], (error) => (error ? reject(error) : resolve()));
  });
}

const source = (args: string[]) => ["-f", "lavfi", "-i", "testsrc=duration=3:size=640x360:rate=25", "-pix_fmt", "yuv420p", ...args];

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "album-video-"));
  await run(source(["-c:v", "libx264", "-movflags", "+faststart", clip("fast.mp4")]));
  await run(source(["-c:v", "libx264", clip("slow.mp4")]));
  await run(source(["-c:v", "libx265", "-tag:v", "hvc1", clip("hevc.mp4")]));
  await run(source(["-c:v", "libx264", clip("movie.mov")]));
  await run(["-display_rotation", "90", "-i", clip("fast.mp4"), "-c", "copy", "-movflags", "+faststart", clip("sideways.mp4")]);
  await writeFile(clip("text.mp4"), "not a video at all, just some text");
  // About 30MB: noise doesn't compress, so every second is ~1.5MB.
  await run(["-f", "lavfi", "-i", "nullsrc=size=1280x720:rate=25:duration=20,geq=random(1)*255:128:128", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "ultrafast", "-b:v", "12M", clip("big.mp4")]);
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

// A local file as a ranged source, keeping the ranges asked for and how
// many bytes were actually taken (ffmpeg often drops a range part-way).
async function fileSource(file: string) {
  const { size } = await stat(file);
  const reads: [number, number][] = [];
  const counter = { taken: 0 };
  return {
    reads,
    counter,
    size,
    open: async (start: number, end: number) => {
      reads.push([start, end]);
      const stream = createReadStream(file, { start, end });
      stream.on("data", (chunk) => (counter.taken += chunk.length));
      return stream;
    },
  };
}

// ---- the box walk

test("an MP4 exported with fast start has its index first", async () => {
  assert.deepEqual(await readMp4Layout(await fileSource(clip("fast.mp4"))), { brand: "isom", fastStart: true });
});

test("an MP4 without fast start has its index after the video data", async () => {
  assert.deepEqual(await readMp4Layout(await fileSource(clip("slow.mp4"))), { brand: "isom", fastStart: false });
});

test("a QuickTime movie says so in its brand, whatever it's called", async () => {
  const layout = await readMp4Layout(await fileSource(clip("movie.mov")));
  assert.equal(layout?.brand, "qt  ");
});

test("a file that isn't an MP4 at all", async () => {
  assert.equal(await readMp4Layout(await fileSource(clip("text.mp4"))), null);
});

test("the walk reads only box headers, not the file", async () => {
  const src = await fileSource(clip("slow.mp4"));
  await readMp4Layout(src);
  assert.ok(src.reads.every(([start, end]) => end - start < 16));
});

// ---- ffmpeg's report

test("codec, size and length from ffmpeg's report", () => {
  const probe = parseVideoProbe(
    [
      "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'x.mp4':",
      "  Duration: 00:04:05.52, start: 0.000000, bitrate: 14012 kb/s",
      "  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 13800 kb/s, 25 fps",
      "  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 192 kb/s",
    ].join("\n"),
  );
  assert.deepEqual(probe, { duration: 245.52, codec: "h264", width: 1920, height: 1080 });
});

test("a clip filmed upright but stored sideways is reported upright", () => {
  const probe = parseVideoProbe(
    [
      "  Duration: 00:00:30.00, start: 0.000000, bitrate: 9000 kb/s",
      "  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1920x1080, 8900 kb/s, 30 fps",
      "    Side data:",
      "      displaymatrix: rotation of -90.00 degrees",
      "  Stream #0:1[0x2](und): Audio: aac (LC), 44100 Hz, stereo",
    ].join("\n"),
  );
  assert.equal(probe.width, 1080);
  assert.equal(probe.height, 1920);
});

test("cover art isn't taken for the video", () => {
  const probe = parseVideoProbe(
    [
      "  Duration: 00:01:00.00, start: 0.000000, bitrate: 900 kb/s",
      "  Stream #0:0: Video: mjpeg (Baseline), yuvj420p, 600x600, 90k tbr (attached pic)",
      "  Stream #0:1(und): Video: hevc (Main) (hvc1 / 0x31637668), yuv420p(tv), 3840x2160, 30 fps",
    ].join("\n"),
  );
  assert.equal(probe.codec, "hevc");
  assert.equal(probe.width, 3840);
});

test("no video stream", () => {
  assert.deepEqual(parseVideoProbe("x.mp4: Invalid data found when processing input"), {
    duration: null,
    codec: null,
    width: null,
    height: null,
  });
});

// ---- ranges

test("byte ranges", () => {
  assert.deepEqual(parseRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange("bytes=900-", 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange("bytes=-100", 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange("bytes=990-2000", 1000), { start: 990, end: 999 });
  assert.equal(parseRange("bytes=1000-", 1000), null);
  assert.equal(parseRange("bytes=5-2", 1000), null);
  assert.equal(parseRange(undefined, 1000), null);
});

test("the loopback server answers ranges and shuts down afterwards", async () => {
  const src = await fileSource(clip("fast.mp4"));
  let url = "";
  const got = await serveOnLoopback(src, async (served: string) => {
    url = served;
    const res = await fetch(served, { headers: { Range: "bytes=4-11" } });
    return { status: res.status, range: res.headers.get("content-range"), body: Buffer.from(await res.arrayBuffer()) };
  });
  assert.equal(got.status, 206);
  assert.equal(got.range, `bytes 4-11/${src.size}`);
  assert.equal(got.body.toString("latin1"), "ftypisom");
  await assert.rejects(fetch(url));
});

// ---- the whole reading, through ffmpeg

test("an H.264 MP4: codec, size, length and a poster frame", async () => {
  const src = await fileSource(clip("fast.mp4"));
  const result = await inspectVideo(src, { withFrame: true });
  assert.equal(result.layout.fastStart, true);
  assert.equal(result.probe.codec, "h264");
  assert.equal(result.probe.width, 640);
  assert.equal(result.probe.height, 360);
  assert.ok(Math.abs(result.probe.duration - 3) < 0.1);
  assert.ok(result.frame && result.frame.subarray(0, 2).toString("hex") === "ffd8", "a JPEG");
});

test("an HEVC MP4 is reported as HEVC", async () => {
  const result = await inspectVideo(await fileSource(clip("hevc.mp4")), { withFrame: false });
  assert.equal(result.probe.codec, "hevc");
  assert.equal(result.frame, null);
});

test("a sideways phone clip comes out upright", async () => {
  const result = await inspectVideo(await fileSource(clip("sideways.mp4")), { withFrame: false });
  assert.equal(result.probe.width, 360);
  assert.equal(result.probe.height, 640);
});

test("a file without fast start is still read, by seeking to its index", async () => {
  const result = await inspectVideo(await fileSource(clip("slow.mp4")), { withFrame: true });
  assert.equal(result.layout.fastStart, false);
  assert.equal(result.probe.codec, "h264");
  assert.ok(result.frame);
});

// The probe takes about 1.5MB (the index and a few packets) and the frame
// about 12MB (ffmpeg decodes from the clip's start up to the 1-second
// mark), whatever the file's size. Before the loopback server answered in
// slices it took over half of this clip, and would have pulled far more of
// a 1GB one.
test("a big file is read in parts, not downloaded", async () => {
  const src = await fileSource(clip("big.mp4"));
  const result = await inspectVideo(src, { withFrame: true });
  assert.ok(src.size > 30 * 1024 * 1024, `the clip is only ${src.size} bytes`);
  assert.equal(result.probe.codec, "h264");
  assert.ok(result.frame);
  assert.ok(src.counter.taken < 20 * 1024 * 1024, `read ${src.counter.taken} of ${src.size} bytes`);
  assert.ok(src.reads.every(([start, end]: [number, number]) => end - start < 1024 * 1024), "each request is one slice at most");
});

test("not a video: nothing for ffmpeg to read", async () => {
  const result = await inspectVideo(await fileSource(clip("text.mp4")), { withFrame: true });
  assert.equal(result.layout, null);
  assert.equal(result.probe.codec, null);
});
