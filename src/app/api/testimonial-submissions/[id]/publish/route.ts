import { headers as getHeaders } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

// Admin-only action behind the "Publish this testimonial" panel
// (TestimonialPublishPanel.tsx) on a pending TestimonialSubmission's edit
// view. Same auth pattern as /api/inquiries/[id]/testimonial-request:
// checked via payload.auth() against the real /hv-studio session, since
// this creates a public-facing Testimonials record.
//
// "Promoting" a photo means re-uploading its bytes into the Photos
// collection as a brand new document — TestimonialPhotos and Photos are
// separate upload collections (deliberately: nothing a client submits goes
// into the public library automatically, see TestimonialPhotos.ts), so
// there's no cheap "move" between them. The bytes are fetched from
// TestimonialPhotos' own access-controlled file route by forwarding this
// request's own session cookie — simplest way to read them server-side
// without reaching past Payload into the S3 client directly.
//
// Testimonials.photo is a single upload field (not hasMany), so at most one
// submitted photo can be attached to the published record — `photoId`
// (if any) is both promoted and attached in one step. Any other photos on
// the submission are simply left un-promoted, still visible on the
// submission itself for reference.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    photoId?: unknown;
    featured?: unknown;
  } | null;

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let submission;
  try {
    submission = await payload.findByID({
      collection: "testimonial-submissions",
      id,
      depth: 1,
      overrideAccess: true,
    });
  } catch {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  if (submission.status !== "pending") {
    return Response.json(
      { error: "This submission has already been published." },
      { status: 400 },
    );
  }

  const categoryId =
    typeof submission.category === "object" && submission.category
      ? submission.category.id
      : submission.category;
  if (!categoryId) {
    return Response.json(
      {
        error:
          "This submission needs a category before it can be published — set one above first.",
      },
      { status: 400 },
    );
  }

  const eventId =
    typeof submission.event === "object" && submission.event
      ? submission.event.id
      : submission.event;

  const requestedPhotoId =
    typeof body?.photoId === "number" ? body.photoId : null;
  const attachedPhotoIds = (submission.photos ?? []).map((photo) =>
    typeof photo === "object" && photo ? photo.id : photo,
  );
  if (requestedPhotoId !== null && !attachedPhotoIds.includes(requestedPhotoId)) {
    return Response.json(
      { error: "That photo isn't attached to this submission." },
      { status: 400 },
    );
  }

  let promotedPhotoId: number | undefined;
  if (requestedPhotoId !== null) {
    const sourcePhoto = await payload.findByID({
      collection: "testimonial-photos",
      id: requestedPhotoId,
      overrideAccess: true,
    });
    if (!sourcePhoto.url || !sourcePhoto.filename) {
      return Response.json(
        { error: "That photo couldn't be read." },
        { status: 500 },
      );
    }

    const fileURL = new URL(sourcePhoto.url, request.url);
    const fileResponse = await fetch(fileURL, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (!fileResponse.ok) {
      payload.logger.error(
        { status: fileResponse.status },
        "[testimonial-submissions publish] failed to fetch the source photo's bytes",
      );
      return Response.json(
        { error: "Failed to read that photo's file." },
        { status: 500 },
      );
    }
    const buffer = Buffer.from(await fileResponse.arrayBuffer());

    const promoted = await payload.create({
      collection: "photos",
      data: {
        alt: `${submission.name}'s testimonial photo`,
        event: eventId ?? undefined,
        category: !eventId ? categoryId : undefined,
      },
      file: {
        data: buffer,
        mimetype: sourcePhoto.mimeType ?? "image/jpeg",
        name: sourcePhoto.filename,
        size: buffer.length,
      },
      overrideAccess: true,
    });
    promotedPhotoId = promoted.id;
  }

  try {
    const testimonial = await payload.create({
      collection: "testimonials",
      data: {
        quote: submission.testimonialText,
        clientName: submission.name,
        category: categoryId,
        event: eventId ?? undefined,
        photo: promotedPhotoId,
        featured: Boolean(body?.featured),
        published: true,
      },
      overrideAccess: true,
    });

    await payload.update({
      collection: "testimonial-submissions",
      id,
      data: { status: "published" },
      overrideAccess: true,
    });

    return Response.json({ success: true, testimonialId: testimonial.id });
  } catch (error) {
    payload.logger.error(
      { err: error },
      "[testimonial-submissions publish] failed to create the Testimonial",
    );
    return Response.json({ error: "Failed to publish." }, { status: 500 });
  }
}
