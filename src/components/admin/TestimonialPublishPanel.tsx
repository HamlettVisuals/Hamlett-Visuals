"use client";

import { useEffect, useState } from "react";
import { useConfig, useDocumentInfo } from "@payloadcms/ui";
import type { TestimonialPhoto } from "@/payload-types";

// The "Publish this testimonial" panel on a pending TestimonialSubmission's
// edit view (wired up via TestimonialSubmissions.ts's publishPanel ui
// field). Posts to /api/testimonial-submissions/[id]/publish, which creates
// the real Testimonials record and marks this submission Published — see
// that route's header comment for the promote/attach reasoning.
//
// useDocumentInfo's `data.photos` only carries raw ids here, not populated
// TestimonialPhoto objects — the edit view's initial document data doesn't
// resolve upload relationships to the depth this panel needs for thumbnails
// (only the built-in Photos field UI does that resolution itself,
// internally). So this fetches each photo's details from Payload's REST API
// directly, the same one InquiryStatusCell.tsx's status PATCH already goes
// through via useConfig().
//
// Only one attached photo can be promoted + attached (Testimonials.photo
// isn't a hasMany field), hence a radio picker rather than checkboxes.
// A full reload after a successful publish (rather than patching local
// state, the way TestimonialRequestBanner does) is deliberate: Payload's
// own `admin.condition` on this field re-evaluates against live form
// state, not the data this component can update in place, so a reload is
// the reliable way to make the panel itself disappear once status flips.
export default function TestimonialPublishPanel() {
  const { id, data } = useDocumentInfo();
  const { config } = useConfig();

  const photoIds = Array.isArray(data?.photos)
    ? data.photos.map((photo) => (typeof photo === "object" && photo ? photo.id : photo))
    : [];

  const [photos, setPhotos] = useState<TestimonialPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [featured, setFeatured] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (photoIds.length === 0) return;
    let cancelled = false;
    Promise.all(
      photoIds.map((photoId) =>
        fetch(
          `${config.serverURL ?? ""}${config.routes.api}/testimonial-photos/${photoId}`,
          { credentials: "include" },
        ).then((res) => (res.ok ? (res.json() as Promise<TestimonialPhoto>) : null)),
      ),
    ).then((results) => {
      if (cancelled) return;
      const loaded = results.filter((photo): photo is TestimonialPhoto => photo !== null);
      setPhotos(loaded);
      setSelectedPhotoId((current) => current ?? loaded[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
    // photoIds is derived fresh from `data` every render; only re-fetch when
    // the actual set of ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoIds.join(",")]);

  if (!id) return null;

  const hasCategory = Boolean(data?.category);

  const publish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/testimonial-submissions/${id}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: selectedPhotoId, featured }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : "Failed to publish.");
      }
      window.location.reload();
    } catch (err) {
      setIsPublishing(false);
      setError(err instanceof Error ? err.message : "Failed to publish.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "16px 18px",
        marginBottom: 24,
        borderRadius: 6,
        border: "1px solid var(--theme-elevation-150)",
        background: "var(--theme-elevation-50)",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "var(--theme-elevation-800)" }}>
        Publish this testimonial
      </p>

      {!hasCategory && (
        <p style={{ margin: 0, color: "var(--theme-error-500)", fontSize: 13 }}>
          Set a category above before publishing.
        </p>
      )}

      {photos.length > 0 && (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--theme-elevation-800)" }}>
            Attach a photo to the published testimonial?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="radio"
                name="publish-photo"
                checked={selectedPhotoId === null}
                onChange={() => setSelectedPhotoId(null)}
              />
              None
            </label>
            {photos.map((photo) => (
              <label
                key={photo.id}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
              >
                <input
                  type="radio"
                  name="publish-photo"
                  checked={selectedPhotoId === photo.id}
                  onChange={() => setSelectedPhotoId(photo.id)}
                />
                {(photo.sizes?.thumbnail?.url || photo.url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.sizes?.thumbnail?.url || photo.url || ""}
                    alt=""
                    width={40}
                    height={40}
                    style={{ objectFit: "cover", borderRadius: 4 }}
                  />
                )}
                <span>{photo.filename}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={featured}
          onChange={(event) => setFeatured(event.target.checked)}
        />
        Feature on the homepage
      </label>

      {error && (
        <p style={{ margin: 0, color: "var(--theme-error-500)", fontSize: 13 }}>{error}</p>
      )}

      <div>
        <button
          type="button"
          onClick={publish}
          disabled={isPublishing || !hasCategory}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            background: "var(--theme-success-500)",
            color: "var(--theme-base-0)",
            cursor: isPublishing || !hasCategory ? "default" : "pointer",
            opacity: isPublishing || !hasCategory ? 0.6 : 1,
          }}
        >
          {isPublishing ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );
}
