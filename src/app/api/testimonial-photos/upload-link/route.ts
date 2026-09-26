import { getPayload } from "payload";
import config from "@payload-config";
import { findRequestByToken, issueUploadLink } from "@/lib/testimonial-uploads";

// Public, token-gated: step 1 of adding a photo on the testimonial form
// (/testimonial-request/[token]). Returns a short-lived signed link the
// browser uploads one photo to, straight to R2. See lib/testimonial-uploads.ts
// for the whole flow and its limits.
//
// Like /api/inquiries/route.ts, Testimonial Photos' own `create` access stays
// admin-only (TestimonialPhotos.ts) — the token itself (unguessable,
// validated against Inquiries.testimonialRequestToken) is what stands in
// for auth on this public path.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; size?: unknown; type?: unknown } | null;
  if (!body) return Response.json({ error: "Invalid upload." }, { status: 400 });

  const payload = await getPayload({ config });
  const inquiry = await findRequestByToken(payload, body.token);
  if (!inquiry) {
    return Response.json({ error: "This link isn't valid." }, { status: 404 });
  }

  try {
    const result = await issueUploadLink({ payload, inquiryId: inquiry.id, size: body.size, type: body.type });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result);
  } catch (error) {
    payload.logger.error({ err: error }, "[testimonial-photos] failed to issue an upload link");
    return Response.json({ error: "Failed to upload that photo." }, { status: 500 });
  }
}
