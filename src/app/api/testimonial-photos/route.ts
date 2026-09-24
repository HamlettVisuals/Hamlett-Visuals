import { getPayload } from "payload";
import config from "@payload-config";
import { RASTER_IMAGE_MIME_TYPES } from "@/lib/raster-image-types";

// Public, token-gated upload target for the testimonial submission form
// (/testimonial-request/[token]) — one photo per request, rather than
// bundling every attached photo into the final submission's own POST.
//
// Investigated before building (per Phase 2 discussion): this deployment's
// server-upload ceiling is ~4.5MB per request (the platform's serverless
// function body limit — the same constraint Backstage.ts's video uploads
// needed clientUploads + CORS to get around). A single client testimonial
// photo is well within that on its own, but a client attaching several
// photos *plus* the text fields in one multipart request could exceed it
// even if no individual file is large. Splitting each photo into its own
// request — capped at MAX_PHOTO_BYTES below — keeps every request small
// regardless of how many photos are attached, so the existing plain
// server-side upload pattern (same as Photos/TestimonialPhotos' own admin
// uploads) is sufficient. No CORS/clientUploads needed here.
//
// Like /api/inquiries/route.ts, this collection's own `create` access stays
// admin-only (TestimonialPhotos.ts) — the token itself (unguessable,
// validated against Inquiries.testimonialRequestToken) is what stands in
// for auth on this public path, same as /api/testimonial-submissions below.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const token = formData?.get("token");
  const file = formData?.get("file");

  if (typeof token !== "string" || !token || !(file instanceof File)) {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!RASTER_IMAGE_MIME_TYPES.includes(file.type)) {
    return Response.json({ error: "Only photo files (JPEG, PNG, WebP, HEIC) are allowed." }, { status: 400 });
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return Response.json(
      { error: "That photo is too large — please choose one under 4MB." },
      { status: 413 },
    );
  }

  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "inquiries",
    where: { testimonialRequestToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (!docs[0]) {
    return Response.json({ error: "This link isn't valid." }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const photo = await payload.create({
      collection: "testimonial-photos",
      data: {},
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
      overrideAccess: true,
    });
    return Response.json({ success: true, id: photo.id });
  } catch (error) {
    payload.logger.error(
      { err: error },
      "[testimonial-photos] failed to save an uploaded photo",
    );
    return Response.json({ error: "Failed to upload that photo." }, { status: 500 });
  }
}
