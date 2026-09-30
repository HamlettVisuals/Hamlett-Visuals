import { RASTER_IMAGE_MIME_TYPES } from "@/lib/raster-image-types";
import { UPLOAD_FOLDERS } from "@/lib/upload-folders";
import { formatMB, MB, PHOTO_MAX_MB } from "@/lib/upload-sizes";

// Uploading a photo into an album from the album page, the same way the
// studio's own upload form does it (clientUploads in payload.config.ts):
//
//   1. ask the R2 plugin for a short-lived signed link
//      (POST /api/storage-s3-generate-signed-url, as its
//      S3ClientUploadHandler does), which also picks a file name no other
//      photo has;
//   2. PUT the file straight to R2 through that link, with XHR rather than
//      fetch so there's upload progress;
//   3. create the photo: the same multipart request Payload's form sends
//      after a client upload, `_payload` (the fields as JSON) and `file` (a
//      JSON description of what's in R2, with its `clientUploadContext`),
//      so the server reads the file back from R2 as usual: the size cap,
//      resizing and GPS removal (lib/photo-resize.ts), thumbnails, and
//      removing the file from R2 if the save is refused
//      (lib/upload-limits.ts).
//
// The photo is created in the album (`event`), so it goes to the album's
// end (Photos.ts), with alt text filled in; she can edit both later.

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

/**
 * The file ready to upload, or why it can't be. Some browsers leave the
 * type of a HEIC photo empty; it's taken from the file name then, since the
 * signed link and the save both need it.
 */
export function checkPhotoFile(file: File): { file: File } | { error: string } {
  const type = file.type || EXTENSION_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
  if (!(RASTER_IMAGE_MIME_TYPES as readonly string[]).includes(type)) {
    return { error: "Not a photo this site can use (JPEG, PNG, WebP, AVIF, GIF or HEIC)." };
  }
  if (file.size > PHOTO_MAX_MB * MB) {
    return { error: `That photo is ${formatMB(file.size, PHOTO_MAX_MB)}. Photos can be up to ${PHOTO_MAX_MB}MB.` };
  }
  return { file: type === file.type ? file : new File([file], file.name, { type, lastModified: file.lastModified }) };
}

const errorMessage = (json: unknown, fallback: string): string => {
  const data = json as { errors?: { message?: string }[]; error?: string; message?: string } | null;
  return data?.errors?.map((e) => e.message).filter(Boolean).join(", ") || data?.error || fallback;
};

export type StoredFile = { filename: string; prefix: string };

/** Steps 1 and 2: the file into R2, reporting progress from 0 to 1. */
export async function putPhotoInStorage(
  file: File,
  apiBase: string,
  onProgress: (fraction: number) => void,
): Promise<StoredFile> {
  const res = await fetch(`${apiBase}/storage-s3-generate-signed-url`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      collectionSlug: "photos",
      docPrefix: UPLOAD_FOLDERS.photos,
      filename: file.name,
      filesize: file.size,
      mimeType: file.type,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.url) throw new Error(errorMessage(json, "Couldn't start the upload."));
  const { url, filename, docPrefix } = json as { url: string; filename?: string; docPrefix?: string };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`The upload was refused (${xhr.status}). Try again.`));
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
    xhr.send(file);
  });
  onProgress(1);

  return { filename: filename || file.name, prefix: docPrefix ?? UPLOAD_FOLDERS.photos };
}

/** Step 3: the photo itself, in the album. */
export async function createAlbumPhoto(
  file: File,
  stored: StoredFile,
  { apiBase, albumId, alt }: { apiBase: string; albumId: number; alt: string },
): Promise<{ id: number }> {
  const form = new FormData();
  form.append("_payload", JSON.stringify({ alt, event: albumId, prefix: stored.prefix }));
  form.append(
    "file",
    JSON.stringify({
      clientUploadContext: { prefix: stored.prefix },
      collectionSlug: "photos",
      filename: stored.filename,
      mimeType: file.type,
      size: file.size,
    }),
  );
  const res = await fetch(`${apiBase}/photos?depth=0`, { method: "POST", credentials: "include", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.doc?.id) throw new Error(errorMessage(json, "The photo couldn't be saved."));
  return json.doc as { id: number };
}
