import path from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fileTypeFromBuffer } from "file-type";
import type { Payload } from "payload";
import { deleteObject, r2, r2Bucket } from "@/lib/r2";
import { RASTER_IMAGE_MIME_TYPES } from "@/lib/raster-image-types";
import { MB, PUBLIC_PHOTO_MAX_MB } from "@/lib/upload-sizes";

// Photos a client adds on the public testimonial form
// (/testimonial-request/[token]) go from their browser straight to R2, like
// the studio's own uploads, so a large phone photo isn't stopped by the
// server's ~4.5MB request limit on Vercel. In three steps:
//
//   1. /api/testimonial-photos/upload-link checks the link's token and
//      returns a signed upload link (issueUploadLink) for one photo, at most
//      PUBLIC_PHOTO_MAX_MB, valid for a few minutes. It points into a
//      holding spot in the bucket, not the Testimonial Photos folder.
//   2. The browser uploads the photo to that link.
//   3. /api/testimonial-photos checks the token again, reads the photo back
//      and checks what it really is from its bytes (takeHeldPhoto), saves it
//      as a Testimonial Photo through Payload (which makes its thumbnail),
//      and deletes the held copy. A refused photo is deleted too.
//
// Flooding: each link holds at most MAX_PHOTOS_PER_LINK photos, counting
// saved ones and ones still in the holding spot. The holding spot has only
// that many slots per link, and a new upload link is only ever for a free
// slot, so however many links are asked for, one link can't put more than
// MAX_PHOTOS_PER_LINK × PUBLIC_PHOTO_MAX_MB in the bucket.
//
// Leftovers: a photo uploaded but never saved (the page closed between
// steps 2 and 3) stays in the holding spot. The link's next upload clears
// held photos older than an hour, and a lifecycle rule on the
// `testimonial-uploads/` folder in R2 clears the rest (see
// docs/launch-checklist.md).

export const MAX_PHOTOS_PER_LINK = 10;
const HOLDING_FOLDER = "testimonial-uploads";
const LINK_EXPIRES_SECONDS = 5 * 60;
const STALE_AFTER_MS = 60 * 60 * 1000;
const MAX_BYTES = PUBLIC_PHOTO_MAX_MB * MB;

type Refusal = { error: string; status: number };

const heldKey = (inquiryId: number, slot: number) => `${HOLDING_FOLDER}/${inquiryId}/${slot}`;

// The Inquiry a testimonial link's token belongs to, if the link is still
// open (the token is cleared once a testimonial is submitted).
export async function findRequestByToken(payload: Payload, token: unknown) {
  if (typeof token !== "string" || !token) return null;
  const { docs } = await payload.find({
    collection: "inquiries",
    where: { testimonialRequestToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return docs[0] ?? null;
}

const savedPhotoCount = async (payload: Payload, inquiryId: number) =>
  (
    await payload.count({
      collection: "testimonial-photos",
      where: { inquiry: { equals: inquiryId } },
      overrideAccess: true,
    })
  ).totalDocs;

// The photos in this link's holding spot, after clearing ones older than
// an hour (uploaded, then never saved).
async function heldSlots(inquiryId: number): Promise<number[]> {
  const { Contents = [] } = await r2().send(
    new ListObjectsV2Command({ Bucket: r2Bucket(), Prefix: `${HOLDING_FOLDER}/${inquiryId}/` }),
  );
  const stale = Contents.filter((object) => object.LastModified && Date.now() - object.LastModified.getTime() > STALE_AFTER_MS);
  if (stale.length > 0) {
    await r2().send(
      new DeleteObjectsCommand({ Bucket: r2Bucket(), Delete: { Objects: stale.map(({ Key }) => ({ Key })) } }),
    );
  }
  return Contents.filter((object) => !stale.includes(object))
    .map((object) => Number(object.Key?.split("/").pop()))
    .filter((slot) => Number.isInteger(slot));
}

const tooMany = (): Refusal => ({
  error: `You can add up to ${MAX_PHOTOS_PER_LINK} photos.`,
  status: 429,
});

// Step 1. `type` is what the browser says the file is. The real check is on
// its bytes in step 3; this only turns away the obviously wrong file early.
// Some browsers don't give a type for HEIC photos, so none is allowed here.
export async function issueUploadLink({
  payload,
  inquiryId,
  size,
  type,
}: {
  payload: Payload;
  inquiryId: number;
  size: unknown;
  type: unknown;
}): Promise<{ url: string; slot: number; contentType: string } | Refusal> {
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
    return { error: "That photo couldn't be read. Please choose it again.", status: 400 };
  }
  const contentType = typeof type === "string" && type ? type : "application/octet-stream";
  if (contentType !== "application/octet-stream" && !RASTER_IMAGE_MIME_TYPES.includes(contentType)) {
    return { error: "Only photos can be added (JPEG, PNG, WebP or HEIC).", status: 400 };
  }
  if (size > MAX_BYTES) {
    return { error: `That photo is too large. Please choose one under ${PUBLIC_PHOTO_MAX_MB}MB.`, status: 413 };
  }

  const held = await heldSlots(inquiryId);
  if ((await savedPhotoCount(payload, inquiryId)) + held.length >= MAX_PHOTOS_PER_LINK) return tooMany();
  const free = Array.from({ length: MAX_PHOTOS_PER_LINK }, (_, slot) => slot).filter((slot) => !held.includes(slot));
  const slot = free[Math.floor(Math.random() * free.length)];

  // The link fixes the size and type the browser must send, so R2 refuses
  // anything else, and it stops working after a few minutes.
  const url = await getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: heldKey(inquiryId, slot),
      ContentLength: size,
      ContentType: contentType,
    }),
    { expiresIn: LINK_EXPIRES_SECONDS, signableHeaders: new Set(["content-length", "content-type"]) },
  );
  return { url, slot, contentType };
}

// Step 3. Saves the held photo as a Testimonial Photo of this link, or
// refuses it. The held copy is deleted either way.
export async function takeHeldPhoto({
  payload,
  inquiryId,
  slot,
  name,
}: {
  payload: Payload;
  inquiryId: number;
  slot: unknown;
  name: unknown;
}): Promise<{ id: number } | Refusal> {
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 0 || slot >= MAX_PHOTOS_PER_LINK) {
    return { error: "Invalid upload.", status: 400 };
  }
  const key = heldKey(inquiryId, slot);
  try {
    const object = await r2()
      .send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }))
      .catch(() => null);
    if (!object?.Body) {
      return { error: "That photo didn't finish uploading. Please try again.", status: 400 };
    }
    if ((object.ContentLength ?? 0) > MAX_BYTES) {
      return { error: `That photo is too large. Please choose one under ${PUBLIC_PHOTO_MAX_MB}MB.`, status: 413 };
    }
    const data = Buffer.from(await object.Body.transformToByteArray());

    const detected = await fileTypeFromBuffer(data);
    if (!detected || !RASTER_IMAGE_MIME_TYPES.includes(detected.mime)) {
      return { error: "That file isn't a photo. Please choose a JPEG, PNG, WebP or HEIC photo.", status: 400 };
    }
    if ((await savedPhotoCount(payload, inquiryId)) >= MAX_PHOTOS_PER_LINK) return tooMany();

    // The client's own file name, with the extension of what the file
    // really is.
    const base = typeof name === "string" ? path.parse(path.basename(name)).name : "";
    const photo = await payload.create({
      collection: "testimonial-photos",
      data: { inquiry: inquiryId },
      file: {
        data,
        mimetype: detected.mime,
        name: `${base || "photo"}.${detected.ext}`,
        size: data.length,
      },
      overrideAccess: true,
    });
    return { id: photo.id };
  } finally {
    await deleteObject(key).catch((err) =>
      payload.logger.warn({ err }, "[testimonial-photos] couldn't remove a held photo"),
    );
  }
}
