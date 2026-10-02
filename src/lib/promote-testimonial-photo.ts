import type { PayloadRequest } from "payload";

// Copies one of a client's submitted photos (TestimonialPhotos: private,
// admin-only) into Photos as a new document, so a testimonial can show it.
// Used by the testimonial photo picker's "Their photos" (Testimonials'
// /promote-photo endpoint); formerly the submission's Publish button.
//
// TestimonialPhotos and Photos are separate upload collections on purpose
// (nothing a client sends reaches the public library by itself), so there's
// no cheap move: the bytes are read from TestimonialPhotos' own
// access-controlled file route with the admin's session cookie and
// uploaded again. The copy belongs to the testimonial only: no album, no
// category, so it isn't added to a gallery, and as it's used by the
// testimonial the studio doesn't count it as unused (lib/photo-usage.ts).
//
// Part of payload.config.ts's module graph, so no "@/…" imports.

export async function promoteTestimonialPhoto(
  req: PayloadRequest,
  { submissionId, photoId }: { submissionId: number; photoId: number },
): Promise<{ id: number } | { error: string; status: number }> {
  const submission = await req.payload
    .findByID({ collection: "testimonial-submissions", id: submissionId, depth: 0, req, overrideAccess: false, user: req.user })
    .catch(() => null);
  if (!submission) return { error: "Submission not found.", status: 404 };

  const attached = (submission.photos ?? []).map((photo) => (typeof photo === "object" && photo ? photo.id : photo));
  if (!attached.includes(photoId)) return { error: "That photo isn't attached to this submission.", status: 400 };

  const source = await req.payload
    .findByID({ collection: "testimonial-photos", id: photoId, req, overrideAccess: false, user: req.user })
    .catch(() => null);
  if (!source?.url || !source.filename) return { error: "That photo couldn't be read.", status: 500 };

  const origin = req.url ? new URL(req.url).origin : undefined;
  const response = await fetch(new URL(source.url, origin), { headers: { cookie: req.headers.get("cookie") ?? "" } });
  if (!response.ok) {
    req.payload.logger.error({ status: response.status }, "[promoteTestimonialPhoto] couldn't read the submitted photo's file");
    return { error: "Failed to read that photo's file.", status: 500 };
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const promoted = await req.payload.create({
    collection: "photos",
    data: { alt: `${submission.name}'s testimonial photo` },
    file: { data: buffer, mimetype: source.mimeType ?? "image/jpeg", name: source.filename, size: buffer.length },
    req,
    overrideAccess: false,
    user: req.user,
  });
  return { id: promoted.id };
}
