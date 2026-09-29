import { randomBytes } from "node:crypto";
import { headers as getHeaders } from "next/headers";
import { getPayload } from "payload";
import { Resend } from "resend";
import config from "@payload-config";
import { emailFrom } from "@/lib/email-from";

// Admin-only action behind the "Request a testimonial" banner
// (TestimonialRequestBanner.tsx) on an Inquiry's edit view. Unlike
// /api/inquiries/route.ts (a deliberately public write path), this one
// requires an authenticated admin session — checked here via payload.auth()
// against the request's cookies, the same session /hv-studio itself uses —
// since it sends an email and mutates a document on her behalf. Doubles as
// the "resend" action: calling it again for the same inquiry just generates
// a fresh token (invalidating the previous link) and re-sends.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let inquiry;
  try {
    inquiry = await payload.findByID({
      collection: "inquiries",
      id,
      overrideAccess: true,
    });
  } catch {
    return Response.json({ error: "Inquiry not found." }, { status: 404 });
  }

  // Wrap-Up is the last stage; archived inquiries are still Wrap-Up.
  if (inquiry.stage !== "wrapup") {
    return Response.json(
      { error: "Only inquiries in Wrap-Up can be sent a testimonial request." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    payload.logger.warn(
      "[testimonial-request] RESEND_API_KEY not set — cannot send the testimonial request email.",
    );
    return Response.json(
      { error: "Email sending isn't configured (missing RESEND_API_KEY)." },
      { status: 500 },
    );
  }

  // 32 random bytes / 64 hex chars — cryptographically secure and
  // non-guessable, same standard as a password-reset token.
  const token = randomBytes(32).toString("hex");
  const siteURL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const requestLink = `${siteURL}/testimonial-request/${token}`;
  // The inquiry is only marked "request sent" (below) once Resend has
  // accepted the email. The SDK doesn't throw when an email isn't sent
  // (refused, or Resend unreachable) — it returns { error } — so that, or
  // anything unexpected thrown, ends here with nothing saved, and the banner
  // shows her the message to try again.
  const sendFailed = () =>
    Response.json({ error: "Email couldn't be sent. Try again later." }, { status: 502 });
  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from: emailFrom().formatted,
      to: inquiry.email,
      subject: "Would you share a quick testimonial?",
      text: `Hi ${inquiry.name},\n\nIt was such a pleasure working with you! If you have a minute, I'd love it if you could share a few words about your experience — it means a lot and helps other clients find me.\n\n${requestLink}\n\nThank you!\n\n— Hamlett Visuals`,
    });
    if (error) {
      payload.logger.error(
        { resendError: error, inquiryId: id },
        `[testimonial-request] couldn't send the testimonial request email for inquiry ${id} — Resend: ${error.name}: ${error.message}`,
      );
      return sendFailed();
    }
  } catch (error) {
    payload.logger.error(
      { err: error, inquiryId: id },
      `[testimonial-request] couldn't send the testimonial request email for inquiry ${id} — unexpected error`,
    );
    return sendFailed();
  }

  const sentAt = new Date().toISOString();
  const updated = await payload.update({
    collection: "inquiries",
    id,
    data: {
      testimonialRequestToken: token,
      testimonialRequestSent: true,
      testimonialRequestSentAt: sentAt,
    },
    overrideAccess: true,
  });

  return Response.json({
    success: true,
    testimonialRequestSent: updated.testimonialRequestSent,
    testimonialRequestSentAt: updated.testimonialRequestSentAt,
  });
}
