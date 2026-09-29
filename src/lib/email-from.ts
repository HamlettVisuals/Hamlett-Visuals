// The "from" line on every email the site sends: the inquiry emails
// (hooks/sendInquiryEmails.ts), the testimonial request
// (api/inquiries/[id]/testimonial-request), and Payload's own emails such as
// forgot-password (the Resend adapter in payload.config.ts, which wants the
// name and address separately).
//
// RESEND_FROM_ADDRESS is "Name <address>" or a bare address. Until a domain is
// verified in Resend it's unset and this falls back to Resend's test sender,
// which only delivers to the Resend account's own inbox — see
// docs/launch-checklist.md.
const FALLBACK_NAME = "Hamlett Visuals";
const FALLBACK_ADDRESS = "onboarding@resend.dev";

export function emailFrom(): { name: string; address: string; formatted: string } {
  const raw = process.env.RESEND_FROM_ADDRESS?.trim();
  if (!raw) {
    return { name: FALLBACK_NAME, address: FALLBACK_ADDRESS, formatted: `${FALLBACK_NAME} <${FALLBACK_ADDRESS}>` };
  }
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  const name = match?.[1].replace(/^"|"$/g, "").trim() || FALLBACK_NAME;
  const address = (match ? match[2] : raw).trim();
  return { name, address, formatted: `${name} <${address}>` };
}
