import type { Config, Endpoint, PayloadRequest } from "payload";
import { APIError, isolateObjectProperty } from "payload";
import { ALBUM_VIDEO_MAX_MB, refusals } from "#src/lib/album-video-limits.ts";
import { VIDEO_MAX_MB } from "#src/lib/backstage-limits.ts";
import { fileTooLargeError } from "#src/lib/upload-limits.ts";
import { LOGO_MAX_MB, MB, PHOTO_MAX_MB } from "#src/lib/upload-sizes.ts";

// Each collection's own size cap, at the moment the studio asks for a
// signed upload link (clientUploads in payload.config.ts), not only when
// the file is saved. The R2 plugin writes one size into every link, the
// largest any upload may be (upload.limits.fileSize: an album video's
// 1GB), so without this a 900MB "photo" would go all the way into R2
// before its save refused it. Here the link is refused straight away,
// with the same words as the save, and a link that is given carries this
// collection's cap, so R2 itself refuses anything bigger.
//
// The plugin's own handler does the work; it reads the cap from
// req.payload.config.upload.limits.fileSize on each request, so it's handed
// a request whose config says this collection's cap. Collections not
// listed (only ever filled by the server) keep the global one.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only — see the note at the top of that file.

export const SIGNED_URL_PATH = "/storage-s3-generate-signed-url";

type Cap = { maxMB: number; noun: string; plural: string };

const photo: Cap = { maxMB: PHOTO_MAX_MB, noun: "photo", plural: "Photos" };

/** The cap for a browser upload to `collection`; null for collections the browser never uploads to. */
export function uploadLinkCap(collection: unknown, mimeType: unknown): Cap | null {
  switch (collection) {
    case "photos":
    case "testimonial-photos":
      return photo;
    case "logos":
      return { maxMB: LOGO_MAX_MB, noun: "logo", plural: "Logos" };
    case "backstage":
      // Photos and videos share the collection (Backstage.ts).
      return typeof mimeType === "string" && mimeType.startsWith("video/")
        ? { maxMB: VIDEO_MAX_MB, noun: "video", plural: "Videos" }
        : photo;
    case "backstage-thumbnails":
      return { maxMB: PHOTO_MAX_MB, noun: "thumbnail", plural: "Thumbnails" };
    case "video-posters":
      return { maxMB: PHOTO_MAX_MB, noun: "poster", plural: "Posters" };
    case "videos":
      return { maxMB: ALBUM_VIDEO_MAX_MB, noun: "video", plural: "Videos" };
    default:
      return null;
  }
}

function withFileSizeLimit(payload: PayloadRequest["payload"], fileSize: number): PayloadRequest["payload"] {
  const { config } = payload;
  return Object.create(payload, {
    config: {
      value: { ...config, upload: { ...config.upload, limits: { ...config.upload?.limits, fileSize } } },
    },
  });
}

/** Wraps the signed-link handler `inner` with the per-collection caps. */
export function limitUploadLinks(inner: Endpoint["handler"]): Endpoint["handler"] {
  return async (req) => {
    const body = (await req.json?.().catch(() => null)) as { collectionSlug?: unknown; filesize?: unknown; mimeType?: unknown } | null;
    const cap = uploadLinkCap(body?.collectionSlug, body?.mimeType);
    const scoped = isolateObjectProperty(req, ["json", "payload"]);
    scoped.json = async () => body;
    if (cap) {
      const size = typeof body?.filesize === "number" ? body.filesize : 0;
      if (size > cap.maxMB * MB) {
        throw body?.collectionSlug === "videos"
          ? new APIError(refusals.tooBig(size), 400, undefined, true)
          : fileTooLargeError({ size, maxMB: cap.maxMB, noun: cap.noun, plural: cap.plural });
      }
      scoped.payload = withFileSizeLimit(req.payload, cap.maxMB * MB);
    }
    return inner(scoped);
  };
}

/**
 * A Payload plugin, placed after s3Storage() so its endpoint exists. Fails
 * loudly if the R2 plugin stops registering it, rather than quietly
 * dropping the caps.
 */
export function uploadLinkLimits(config: Config): Config {
  const endpoint = config.endpoints?.find((e) => e.path === SIGNED_URL_PATH && e.method === "post");
  if (!endpoint) throw new Error(`uploadLinkLimits: no ${SIGNED_URL_PATH} endpoint; is it after s3Storage() with clientUploads?`);
  endpoint.handler = limitUploadLinks(endpoint.handler);
  return config;
}
