import type { DefaultServerCellComponentProps } from "payload";
import { isVideoMimeType } from "@/lib/backstage-limits";

// The Backstage list's thumbnail (collections/Backstage.ts, `preview`
// column), with a small video or photo mark in the corner. A photo is its
// own thumbnail; a video shows its `poster` (made from a frame of it, or
// one she chose), or the neutral placeholder if it has none. A server
// component, so the poster lookup is one small query per video row.
export default async function BackstageThumbnailCell({ payload, rowData }: DefaultServerCellComponentProps) {
  const isVideo = isVideoMimeType(rowData?.mimeType);
  let src: string | null | undefined = null;

  if (isVideo) {
    const poster = rowData?.poster;
    const posterId = poster && typeof poster === "object" ? poster.id : poster;
    const thumbnail = posterId
      ? await payload
          .findByID({ collection: "backstage-thumbnails", id: posterId, depth: 0, disableErrors: true })
          .catch(() => null)
      : null;
    src = thumbnail?.sizes?.thumbnail?.url || thumbnail?.url;
  } else {
    src = rowData?.sizes?.thumbnail?.url || rowData?.url;
  }

  const kind = isVideo ? "Video" : "Photo";
  return (
    <span className="backstage-thumb" title={kind}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail from the media store
        <img className="category-thumb" src={src} alt="" loading="lazy" />
      ) : (
        <span className="category-thumb category-thumb--empty" />
      )}
      <span className="backstage-thumb__kind" role="img" aria-label={kind}>
        {isVideo ? (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="2" y="3.5" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="2.2" fill="currentColor" />
          </svg>
        )}
      </span>
    </span>
  );
}
