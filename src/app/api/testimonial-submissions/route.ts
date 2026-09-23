import { getPayload } from "payload";
import config from "@payload-config";

// Public, token-gated write path for the testimonial submission form
// (/testimonial-request/[token]) — same shape as /api/inquiries/route.ts:
// TestimonialSubmissions' own `create` access stays admin-only, so this is
// the one place allowed to create a record on a visitor's behalf, after
// validating the token server-side.
//
// name/email/category/event are carried forward here (not accepted from the
// client) from the Inquiry the token belongs to — category/event come
// through the Inquiry's linked Event, per the correction noted in
// TestimonialSubmissions.ts. Once the submission is created, the token is
// cleared so the same link can't be used to submit twice.
type SubmissionBody = {
  token?: unknown;
  testimonialText?: unknown;
  socialLink?: unknown;
  privateNotes?: unknown;
  photoIds?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SubmissionBody | null;

  if (
    !body ||
    !isNonEmptyString(body.token) ||
    !isNonEmptyString(body.testimonialText)
  ) {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }

  const photoIds = Array.isArray(body.photoIds)
    ? body.photoIds.filter((id): id is number => typeof id === "number")
    : [];

  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "inquiries",
    where: { testimonialRequestToken: { equals: body.token } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });
  const inquiry = docs[0];
  if (!inquiry) {
    return Response.json({ error: "This link isn't valid." }, { status: 404 });
  }

  const event = typeof inquiry.event === "object" && inquiry.event ? inquiry.event : null;
  const category =
    event && typeof event.category === "object" && event.category ? event.category : null;

  try {
    const submission = await payload.create({
      collection: "testimonial-submissions",
      data: {
        inquiry: inquiry.id,
        name: inquiry.name,
        email: inquiry.email,
        category: category?.id,
        event: event?.id,
        testimonialText: body.testimonialText.trim(),
        photos: photoIds,
        socialLink: isNonEmptyString(body.socialLink) ? body.socialLink.trim() : undefined,
        privateNotes: isNonEmptyString(body.privateNotes)
          ? body.privateNotes.trim()
          : undefined,
        status: "pending",
      },
      overrideAccess: true,
    });

    await payload.update({
      collection: "inquiries",
      id: inquiry.id,
      data: { testimonialRequestToken: null },
      overrideAccess: true,
    });

    return Response.json({ success: true, id: submission.id });
  } catch (error) {
    payload.logger.error(
      { err: error },
      "[testimonial-submissions] failed to save a submission",
    );
    return Response.json({ error: "Failed to save your testimonial." }, { status: 500 });
  }
}
