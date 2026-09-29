import type { CollectionAfterChangeHook } from "payload";
import { Resend } from "resend";
import type { Inquiry } from "#src/payload-types.ts";
import { emailFrom } from "#src/lib/email-from.ts";

// Fires once per newly-created Inquiry (from either AskQuestionPanel or
// BookingForm, via /api/inquiries) — notifies the studio owner and
// auto-replies to the client. Guarded on RESEND_API_KEY: without one (e.g.
// local dev before a real key is added), this logs and no-ops rather than
// failing the request that created the record — a missing email integration
// should never block a visitor's inquiry from being saved. Same reasoning
// for each send being its own try/catch: a failed owner notification
// shouldn't skip the client's auto-reply, or vice versa.
//
// The Resend SDK doesn't throw when an email isn't sent — whether Resend
// refused it (bad sender, unverified domain, rate limit…) or couldn't be
// reached — it returns { error }, so that's checked explicitly. The
// try/catch is only a backstop for anything unexpected.
export const sendInquiryEmails: CollectionAfterChangeHook<Inquiry> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    req.payload.logger.warn(
      "[inquiries] RESEND_API_KEY not set — skipping owner notification and client auto-reply emails.",
    );
    return doc;
  }

  const fromAddress = emailFrom().formatted;

  // Site Settings' contact email is the one source of truth for "her" inbox
  // (same field the Footer/Booking CTA already show) — falls back only if
  // that global can't be read for some reason.
  let notifyEmail = "hello@example.com";
  try {
    const siteSettings = await req.payload.findGlobal({ slug: "site-settings" });
    notifyEmail = siteSettings.contact?.email || notifyEmail;
  } catch (error) {
    req.payload.logger.error(
      { err: error },
      "[inquiries] failed to read Site Settings for the notification address — using fallback.",
    );
  }

  const resend = new Resend(apiKey);
  const isBooking = doc.type === "booking";

  const send = async (label: string, message: Parameters<Resend["emails"]["send"]>[0]) => {
    try {
      const { error } = await resend.emails.send(message);
      if (error) {
        req.payload.logger.error(
          { resendError: error, inquiryId: doc.id },
          `[inquiries] couldn't send the ${label} email for inquiry ${doc.id} — Resend: ${error.name}: ${error.message}`,
        );
      }
    } catch (error) {
      req.payload.logger.error(
        { err: error, inquiryId: doc.id },
        `[inquiries] couldn't send the ${label} email for inquiry ${doc.id} — unexpected error`,
      );
    }
  };

  const detailLines = [
    `Name: ${doc.name}`,
    `Email: ${doc.email}`,
    doc.phone ? `Phone: ${doc.phone}` : null,
    doc.preferredDate ? `Preferred date: ${doc.preferredDate}` : null,
    `From page: ${doc.sourcePage}`,
    "",
    doc.message,
  ].filter((line): line is string => line !== null);

  await send("owner notification", {
    from: fromAddress,
    to: notifyEmail,
    replyTo: doc.email,
    subject: `New ${isBooking ? "booking request" : "question"} from ${doc.name}`,
    text: detailLines.join("\n"),
  });

  await send("client auto-reply", {
    from: fromAddress,
    to: doc.email,
    subject: isBooking ? "We got your booking request" : "We got your question",
    text: isBooking
      ? `Hi ${doc.name},\n\nThanks for reaching out — your booking request has been received. She reads every one herself and usually replies within a day or two.\n\n— Hamlett Visuals`
      : `Hi ${doc.name},\n\nThanks for your question — it's been received and we typically reply within 1–2 business days.\n\n— Hamlett Visuals`,
  });

  return doc;
};
