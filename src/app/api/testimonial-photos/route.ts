import { getPayload } from "payload";
import config from "@payload-config";
import { findRequestByToken, takeHeldPhoto } from "@/lib/testimonial-uploads";

// Public, token-gated: step 3 of adding a photo on the testimonial form
// (/testimonial-request/[token]), after the browser has uploaded it to the
// link from ./upload-link. Checks what the file really is and saves it as a
// Testimonial Photo tied to this link, or refuses it; see
// lib/testimonial-uploads.ts.
//
// Like /api/inquiries/route.ts, this collection's own `create` access stays
// admin-only (TestimonialPhotos.ts) — the token itself (unguessable,
// validated against Inquiries.testimonialRequestToken) is what stands in
// for auth on this public path, same as /api/testimonial-submissions.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; slot?: unknown; name?: unknown } | null;
  if (!body) return Response.json({ error: "Invalid upload." }, { status: 400 });

  const payload = await getPayload({ config });
  const inquiry = await findRequestByToken(payload, body.token);
  if (!inquiry) {
    return Response.json({ error: "This link isn't valid." }, { status: 404 });
  }

  try {
    const result = await takeHeldPhoto({ payload, inquiryId: inquiry.id, slot: body.slot, name: body.name });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ success: true, id: result.id });
  } catch (error) {
    payload.logger.error({ err: error }, "[testimonial-photos] failed to save an uploaded photo");
    return Response.json({ error: "Failed to upload that photo." }, { status: 500 });
  }
}
