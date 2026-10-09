import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { extractFrame, runFfmpeg } from "#src/lib/backstage-media.ts";
import { r2, r2Bucket } from "#src/lib/r2.ts";

// Reads an album video (collections/Videos.ts) where it already is, in R2,
// without copying it to the server: a 1GB file wouldn't fit in a Vercel
// function's /tmp (about 500MB), which is why Videos has no `mimeTypes`
// list (with one, Payload downloads the whole file on save).
//
//   - readMp4Layout: walks the file's top-level boxes, a few small ranged
//     reads, to tell a real MP4 from a renamed QuickTime movie and to see
//     whether it's set up for fast start (the index, `moov`, before the
//     video data, `mdat`). Without fast start a browser has to fetch the
//     end of the file before it can play.
//   - inspectStoredVideo: ffmpeg's reading of the codec, size and length,
//     and a frame for the automatic poster. ffmpeg-static on Vercel is a
//     static Linux build, which can't look up host names (no DNS without
//     nscd), so ffmpeg never fetches from R2 itself: it reads
//     http://127.0.0.1 from a small server inside this function
//     (serveOnLoopback), which passes each ranged request on to R2. ffmpeg
//     asks only for the parts it needs (the index, then a few frames).
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only — see the note at the top of that file.

/** A file that can be read in byte ranges: its size, and a stream of one range. */
export type RangedSource = {
  size: number;
  /** Bytes start..end, both inclusive. */
  open: (start: number, end: number) => Promise<Readable>;
};

export async function r2Source(key: string): Promise<RangedSource> {
  const head = await r2().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
  const size = head.ContentLength ?? 0;
  if (!size) throw new Error(`No file in storage for ${key}.`);
  return {
    size,
    open: async (start, end) => {
      const { Body } = await r2().send(
        new GetObjectCommand({ Bucket: r2Bucket(), Key: key, Range: `bytes=${start}-${end}` }),
      );
      if (!Body) throw new Error(`No file in storage for ${key}.`);
      return Body as Readable;
    },
  };
}

/** A file that's still in memory: a save made on the server rather than uploaded from the studio. */
export function bufferSource(data: Buffer): RangedSource {
  return { size: data.length, open: async (start, end) => Readable.from([data.subarray(start, end + 1)]) };
}

async function readBytes(source: RangedSource, start: number, length: number): Promise<Buffer> {
  const end = Math.min(source.size, start + length) - 1;
  if (end < start) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of await source.open(start, end)) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks);
}

export type Mp4Layout = {
  /** The `ftyp` box's major brand, e.g. "isom", "mp42", or "qt  " for QuickTime. */
  brand: string;
  /** True with the index first (fast start), false after the video data, null if neither was found. */
  fastStart: boolean | null;
};

/**
 * The file's container, from its top-level boxes; null when it doesn't
 * start like an MP4 or QuickTime file at all.
 */
export async function readMp4Layout(source: RangedSource): Promise<Mp4Layout | null> {
  let offset = 0;
  let brand: string | null = null;
  // Real files have a handful of top-level boxes before `moov` or `mdat`
  // (ftyp, free, wide, uuid…); the cap stops a corrupt file looping.
  for (let box = 0; box < 32 && offset + 8 <= source.size; box++) {
    const header = await readBytes(source, offset, 16);
    if (header.length < 8) break;
    let size = header.readUInt32BE(0);
    const type = header.toString("latin1", 4, 8);
    if (box === 0) {
      if (type !== "ftyp" || header.length < 12) return null;
      brand = header.toString("latin1", 8, 12);
    }
    if (type === "moov") return { brand: brand as string, fastStart: true };
    if (type === "mdat") return { brand: brand as string, fastStart: false };
    if (size === 1) {
      if (header.length < 16) break;
      size = Number(header.readBigUInt64BE(8));
    } else if (size === 0) {
      break; // runs to the end of the file
    }
    if (size < 8) break;
    offset += size;
  }
  return brand === null ? null : { brand, fastStart: null };
}

export type VideoProbe = {
  /** Seconds, or null when ffmpeg printed no duration. */
  duration: number | null;
  /** ffmpeg's codec name, e.g. "h264", "hevc"; null with no video stream. */
  codec: string | null;
  /** As shown: a phone clip stored sideways with a rotation flag is swapped upright. */
  width: number | null;
  height: number | null;
};

/** What ffmpeg prints about its input (`ffmpeg -i <file>`), read for the first video stream. */
export function parseVideoProbe(stderr: string): VideoProbe {
  const durationMatch = stderr.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  const duration = durationMatch
    ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
    : null;

  // "Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], …"
  // Cover art in a file shows as a video stream too, marked "(attached pic)".
  const lines = stderr.split(/\r?\n/);
  const streamIndex = lines.findIndex((line) => /Stream #\d+:\d+.*: Video: /.test(line) && !/attached pic/.test(line));
  if (streamIndex < 0) return { duration, codec: null, width: null, height: null };
  const stream = lines[streamIndex];
  const codec = stream.match(/: Video: ([\w-]+)/)?.[1] ?? null;
  const size = stream.match(/,\s*(\d{2,5})x(\d{2,5})[\s,]/);
  let width = size ? Number(size[1]) : null;
  let height = size ? Number(size[2]) : null;

  // The rotation flag, in the stream's own block (up to the next stream):
  // "displaymatrix: rotation of -90.00 degrees" (ffmpeg 5+) or "rotate : 90".
  const nextStream = lines.findIndex((line, i) => i > streamIndex && /^\s*Stream #/.test(line));
  const block = lines.slice(streamIndex + 1, nextStream < 0 ? undefined : nextStream).join("\n");
  const rotation = Number(
    block.match(/rotation of (-?[\d.]+) degrees/)?.[1] ?? block.match(/rotate\s*:\s*(-?\d+)/)?.[1] ?? 0,
  );
  if (Math.abs(Math.round(rotation)) % 180 === 90) [width, height] = [height, width];
  return { duration, codec, width, height };
}

/** Parses one "bytes=a-b" Range header against the file's size; null for none or an unusable one. */
export function parseRange(header: string | undefined, size: number): { start: number; end: number } | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return null;
  let start: number;
  let end: number;
  if (!match[1]) {
    // "bytes=-500": the last 500 bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  return start <= end && start < size ? { start, end } : null;
}

/** The most one loopback answer carries (see serveOnLoopback). */
export const LOOPBACK_SLICE_BYTES = 1024 * 1024;

/**
 * Serves `source` at http://127.0.0.1:<port>/video while `work` runs, with
 * the range support ffmpeg needs to seek, then shuts the server down.
 */
export async function serveOnLoopback<T>(source: RangedSource, work: (url: string) => Promise<T>): Promise<T> {
  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    const range = parseRange(req.headers.range, source.size);
    if (req.headers.range && !range) {
      res.writeHead(416, { "Content-Range": `bytes */${source.size}` }).end();
      return;
    }
    const start = range?.start ?? 0;
    // ffmpeg asks for "from here to the end" and then reads as much as it
    // needs. Streamed whole, the rest of a 1GB file would pour into socket
    // buffers (and out of R2) until ffmpeg hung up, so each answer is at
    // most one slice; ffmpeg asks again from where the slice ended.
    const end = range ? Math.min(range.end, start + LOOPBACK_SLICE_BYTES - 1) : source.size - 1;
    res.writeHead(range ? 206 : 200, {
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Type": "video/mp4",
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${source.size}` } : {}),
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    // ffmpeg often reads part of a range, then drops the connection to
    // seek elsewhere; pipeline then tears down the R2 stream too.
    await pipeline(await source.open(start, end), res).catch(() => undefined);
  };
  const server = createServer((req, res) => {
    handle(req, res).catch(() => res.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  try {
    return await work(`http://127.0.0.1:${port}/video`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

// The automatic poster is shown as large as the video itself (the full
// width of a category page, so up to ~1800px on a sharp screen).
const POSTER_MAX_SIDE = 1920;

export type VideoInspection = {
  layout: Mp4Layout | null;
  probe: VideoProbe;
  /** A JPEG for the automatic poster, when `withFrame` and ffmpeg managed one. */
  frame: Buffer | null;
};

/** Everything a save needs to know about a stored video, read in place. */
export async function inspectVideo(source: RangedSource, { withFrame }: { withFrame: boolean }): Promise<VideoInspection> {
  const layout = await readMp4Layout(source);
  if (!layout) return { layout, probe: { duration: null, codec: null, width: null, height: null }, frame: null };
  return serveOnLoopback(source, async (url) => {
    const { stderr } = await runFfmpeg(["-hide_banner", "-i", url]);
    const probe = parseVideoProbe(stderr);
    const frame = withFrame && probe.codec ? await extractFrame(url, probe.duration, POSTER_MAX_SIDE) : null;
    return { layout, probe, frame };
  });
}
