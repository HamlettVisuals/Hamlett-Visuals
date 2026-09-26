import type { CollectionAfterErrorHook, CollectionBeforeChangeHook } from "payload";
import { APIError } from "payload";
import { UPLOAD_FOLDERS, deleteObject, storedFileKey } from "#src/lib/r2.ts";
import { MB, formatMB } from "#src/lib/upload-sizes.ts";

// Save-time checks for the studio's uploads: the per-collection size caps
// (sizes in upload-sizes.ts) and removing a refused file from R2.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only — see the note at the top of that file.

// Refuses a file over `maxMB` on save, in plain words, e.g. "That logo is
// 7.4MB. Logos can be up to 5MB." An APIError rather than a
// ValidationError, and without colons or commas: Payload's error toast
// shows an APIError's message as-is but reads "message: a, b" as a list of
// fields. The refused file itself is removed by removeRefusedUpload below.
export function limitFileSize({
  maxMB,
  noun,
  plural,
}: {
  maxMB: number;
  noun: string;
  plural: string;
}): CollectionBeforeChangeHook {
  return ({ data, req }) => {
    const size = req.file?.size;
    if (typeof size === "number" && size > maxMB * MB) {
      throw fileTooLargeError({ size, maxMB, noun, plural });
    }
    return data;
  };
}

// The refusal itself, shared with photo-resize.ts (which checks the
// original before shrinking it).
export function fileTooLargeError({
  size,
  maxMB,
  noun,
  plural,
}: {
  size: number;
  maxMB: number;
  noun: string;
  plural: string;
}) {
  return new APIError(`That ${noun} is ${formatMB(size, maxMB)}. ${plural} can be up to ${maxMB}MB.`, 400, undefined, true);
}

// A file sent straight from the browser is already in R2 before the save
// runs. When the save is then refused (too big, the wrong kind of file,
// any other error), the file would sit there unused, so it's deleted
// again. Its name was made unique for this collection when the upload
// link was issued, so no saved item uses it.
export const removeRefusedUpload: CollectionAfterErrorHook = async ({ collection, req }) => {
  const file = req.file as { clientUploadContext?: unknown; name?: string } | undefined;
  if (!file?.clientUploadContext || !file.name) return;
  const folder = UPLOAD_FOLDERS[collection.slug as keyof typeof UPLOAD_FOLDERS];
  if (!folder) return;
  await deleteObject(storedFileKey(folder, file.name)).catch((err) =>
    req.payload.logger.warn({ err }, `[uploads] couldn't remove a refused upload (${collection.slug})`),
  );
};
