import { ALBUM_VIDEO_MAX_MB, ALBUM_VIDEO_MIME_TYPE, refusals } from "@/lib/album-video-limits";
import { RASTER_IMAGE_MIME_TYPES } from "@/lib/raster-image-types";
import { UPLOAD_FOLDERS } from "@/lib/upload-folders";
import { formatMB, MB, PHOTO_MAX_MB } from "@/lib/upload-sizes";

// Uploading a file into an album from the album page (a photo, a video, or
// a video's poster), the same way the studio's own upload form does it
// (clientUploads in payload.config.ts):
//
//   1. ask the R2 plugin for a short-lived signed link
//      (POST /api/storage-s3-generate-signed-url, as its
//      S3ClientUploadHandler does), which also picks a file name nothing
//      else in the collection has, and carries the collection's size cap
//      (lib/upload-link-limits.ts);
//   2. PUT the file straight to R2 through that link, with XHR rather than
//      fetch so there's upload progress;
//   3. create the record: the same multipart request Payload's form sends
//      after a client upload, `_payload` (the fields as JSON) and `file` (a
//      JSON description of what's in R2, with its `clientUploadContext`),
//      so the server checks the file in R2 as usual: for a photo the size
//      cap, resizing and GPS removal (lib/photo-resize.ts) and thumbnails;
//      for a video its format and length (Videos.ts); and the file is
//      removed from R2 if the save is refused (lib/upload-limits.ts).
//
// A photo or video is created in the album (`event`), so it goes to the
// album's end, with alt text or a title filled in; she can edit both later.

type Collection = "photos" | "videos";

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

/**
 * The same for a video: an .mp4 up to 1GB. What's inside it (H.264 or not,
 * how long) can only be told once it's in R2, on save. A browser that
 * leaves the type empty gets it from the name.
 */
export function checkVideoFile(file: File): { file: File } | { error: string } {
  const isMp4Name = /\.mp4$/i.test(file.name);
  if (file.type ? file.type !== ALBUM_VIDEO_MIME_TYPE : !isMp4Name) return { error: refusals.notMp4(file.name) };
  if (file.size > ALBUM_VIDEO_MAX_MB * MB) return { error: refusals.tooBig(file.size) };
  return {
    file: file.type ? file : new File([file], file.name, { type: ALBUM_VIDEO_MIME_TYPE, lastModified: file.lastModified }),
  };
}

const errorMessage = (json: unknown, fallback: string): string => {
  const data = json as { errors?: { message?: string }[]; error?: string; message?: string } | null;
  return data?.errors?.map((e) => e.message).filter(Boolean).join(", ") || data?.error || fallback;
};

export type StoredFile = { filename: string; prefix: string };

/** Steps 1 and 2: the file into R2, reporting progress from 0 to 1. */
export async function putInStorage(
  collection: Collection,
  file: File,
  apiBase: string,
  onProgress: (fraction: number) => void,
): Promise<StoredFile> {
  const res = await fetch(`${apiBase}/storage-s3-generate-signed-url`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      collectionSlug: collection,
      docPrefix: UPLOAD_FOLDERS[collection],
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

  return { filename: filename || file.name, prefix: docPrefix ?? UPLOAD_FOLDERS[collection] };
}

/** Step 3: the record, with `fields` and the stored file. */
async function createWithStoredFile(
  collection: Collection,
  file: File,
  stored: StoredFile,
  fields: Record<string, unknown>,
  apiBase: string,
  failure: string,
): Promise<{ id: number }> {
  const form = new FormData();
  form.append("_payload", JSON.stringify({ ...fields, prefix: stored.prefix }));
  form.append(
    "file",
    JSON.stringify({
      clientUploadContext: { prefix: stored.prefix },
      collectionSlug: collection,
      filename: stored.filename,
      mimeType: file.type,
      size: file.size,
    }),
  );
  const res = await fetch(`${apiBase}/${collection}?depth=0`, { method: "POST", credentials: "include", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.doc?.id) throw new Error(errorMessage(json, failure));
  return json.doc as { id: number };
}

/** A photo, in the album (or in none: a video's poster uploaded for it). */
export function createAlbumPhoto(
  file: File,
  stored: StoredFile,
  { apiBase, albumId, alt }: { apiBase: string; albumId: number | null; alt: string },
): Promise<{ id: number }> {
  return createWithStoredFile("photos", file, stored, { alt, event: albumId }, apiBase, "The photo couldn't be saved.");
}

/** A video, in the album. Its title is left blank; she adds one if she wants. */
export function createAlbumVideo(
  file: File,
  stored: StoredFile,
  { apiBase, albumId }: { apiBase: string; albumId: number },
): Promise<{ id: number }> {
  return createWithStoredFile("videos", file, stored, { event: albumId }, apiBase, "The video couldn't be saved.");
}
