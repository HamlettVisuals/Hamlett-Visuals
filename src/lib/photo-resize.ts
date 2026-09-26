import { readFile, writeFile } from "node:fs/promises";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import type { CollectionBeforeOperationHook } from "payload";
import { UPLOAD_FOLDERS, r2, r2Bucket, storedFileKey } from "#src/lib/r2.ts";
import { MB } from "#src/lib/upload-sizes.ts";
import { fileTooLargeError } from "#src/lib/upload-limits.ts";

// Straight-from-camera photos are welcome (up to PHOTO_MAX_MB), but what's
// stored and served is web-sized: a photo over MAX_EDGE px on its long edge
// is shrunk to MAX_EDGE on save. Vercel's image optimizer refuses sources
// over 8192px and pulls the whole source for every size it makes, so a
// 3000px, ~2–4MB original keeps the site fast. Either way, the photo is
// turned the right way up, keeps its colour profile, and loses its camera
// location (GPS) data; its other camera data (EXIF) goes with it.
//
// A photo that's already small enough and has no GPS data is left exactly
// as uploaded, byte for byte: re-saving a JPEG always costs a little
// quality. JPEGs are re-saved at quality 90, PNG and WebP keep their own
// format (PNG is lossless). GIFs (may be animated) and HEIC (sharp can't
// read it) are stored as uploaded.
//
// Runs as a beforeOperation hook: after Payload has fetched a browser
// upload back from R2 (onto req.file, as a temp file) and before it records
// the file's size and dimensions and makes the thumbnail, so both come from
// the resized photo. The storage plugin never re-uploads a file that came
// straight from the browser, so the resized one is written over it in R2
// here. The size cap is checked first, on the original, since the resized
// file is always smaller.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only — see the note at the top of that file.

const MAX_EDGE = 3000;
const JPEG_QUALITY = 90;
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type IncomingFile = {
  data: Buffer;
  mimetype: string;
  name: string;
  size: number;
  tempFilePath?: string;
  clientUploadContext?: unknown;
};

export function resizeLargePhotos({
  maxMB,
  noun,
  plural,
}: {
  maxMB: number;
  noun: string;
  plural: string;
}): CollectionBeforeOperationHook {
  return async ({ args, collection, operation, req }) => {
    if (operation !== "create" && operation !== "update") return args;
    const file = req.file as IncomingFile | undefined;
    if (!file || !file.mimetype?.startsWith("image/")) return args;

    if (file.size > maxMB * MB) throw fileTooLargeError({ size: file.size, maxMB, noun, plural });
    if (!RESIZABLE.has(file.mimetype)) return args;

    const input = file.tempFilePath ? await readFile(file.tempFilePath) : file.data;
    const meta = await sharp(input).metadata();
    // Width and height as displayed, i.e. after turning the photo upright.
    const longEdge = Math.max(meta.autoOrient?.width ?? meta.width ?? 0, meta.autoOrient?.height ?? meta.height ?? 0);
    const tooLarge = longEdge > MAX_EDGE;
    const hasGps = hasGpsData(meta.exif);
    if (!tooLarge && !hasGps) return args;

    let image = sharp(input).autoOrient().keepIccProfile();
    if (tooLarge) image = image.resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true });
    if (file.mimetype === "image/jpeg") image = image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    else if (file.mimetype === "image/png") image = image.png();
    else if (file.mimetype === "image/webp") image = image.webp({ quality: JPEG_QUALITY });
    else image = image.avif({ quality: JPEG_QUALITY });
    const output = await image.toBuffer();

    if (file.tempFilePath) await writeFile(file.tempFilePath, output);
    else file.data = output;
    file.size = output.length;

    // Already in R2 at full size (sent from the browser): replace it there.
    // Anything else is uploaded later by the storage plugin, from req.file.
    if (file.clientUploadContext) {
      const folder = UPLOAD_FOLDERS[collection.slug as keyof typeof UPLOAD_FOLDERS];
      await r2().send(
        new PutObjectCommand({
          Bucket: r2Bucket(),
          Key: storedFileKey(folder, file.name),
          Body: output,
          ContentType: file.mimetype,
          ContentLength: output.length,
        }),
      );
    }
    req.payload.logger.info(
      `[photo-resize] ${collection.slug}: ${file.name} ${meta.width}×${meta.height}` +
        `${tooLarge ? ` → ${MAX_EDGE}px long edge` : ""}${hasGps ? ", GPS removed" : ""}, ${(output.length / MB).toFixed(1)}MB`,
    );
    return args;
  };
}

// Whether a photo's EXIF block (as sharp returns it: "Exif\0\0", then a TIFF
// header) points to a GPS section, tag 0x8825 in its first directory.
// Anything unreadable counts as "maybe", so the photo is cleaned anyway.
function hasGpsData(exif: Buffer | undefined): boolean {
  if (!exif || exif.length < 14) return false;
  try {
    const tiff = exif.subarray(exif.toString("latin1", 0, 4) === "Exif" ? 6 : 0);
    const little = tiff.toString("latin1", 0, 2) === "II";
    const u16 = (at: number) => (little ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at));
    const u32 = (at: number) => (little ? tiff.readUInt32LE(at) : tiff.readUInt32BE(at));
    const ifd0 = u32(4);
    const entries = u16(ifd0);
    for (let i = 0; i < entries; i++) {
      if (u16(ifd0 + 2 + i * 12) === 0x8825) return true;
    }
    return false;
  } catch {
    return true;
  }
}
