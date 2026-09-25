import type { ContactDetails } from "@/lib/contact-details";

// The Booking CTA's contact line (components/home/BookingCta.tsx), built
// from the lead-in she writes and whichever contacts are switched on in the
// Booking CTA editor AND filled in on Site Settings, always in the order
// email, phone, Instagram:
//   one:   "Prefer to email? hello@example.com."
//          "Prefer to email? Call (555) 123-4567."
//   two:   "Prefer to email? hello@example.com, or find me at @handle."
//   three: "Prefer to email? hello@example.com, call (555) 123-4567, or find me at @handle."
// The first phrase is capitalised after a lead-in that ends a sentence
// (".", "?" or "!") or when there's no lead-in, and continues in lower case
// after one like "Or reach me:". With nothing to show the line is left out.

export type ContactLinkPart = {
  kind: "email" | "phone" | "instagram";
  /** Words before the link, e.g. "call " — empty for the email. */
  before: string;
  text: string;
  href: string;
  external: boolean;
};

export type ContactLine = {
  leadIn: string;
  parts: ContactLinkPart[];
};

export type ContactSwitches = {
  showEmail?: boolean | null;
  showPhone?: boolean | null;
  showInstagram?: boolean | null;
};

export function buildContactLine(
  leadInRaw: string | null | undefined,
  switches: ContactSwitches,
  details: ContactDetails,
): ContactLine | null {
  const parts: ContactLinkPart[] = [];
  if (switches.showEmail !== false && details.email) {
    parts.push({
      kind: "email",
      before: "",
      text: details.email,
      href: `mailto:${details.email}`,
      external: false,
    });
  }
  if (switches.showPhone !== false && details.phone) {
    parts.push({
      kind: "phone",
      before: "call ",
      text: details.phone.display,
      href: details.phone.href,
      external: false,
    });
  }
  if (switches.showInstagram !== false && details.instagram) {
    parts.push({
      kind: "instagram",
      before: "find me at ",
      text: details.instagram.handle,
      href: details.instagram.url,
      external: true,
    });
  }
  if (parts.length === 0) return null;

  const leadIn = (leadInRaw ?? "").trim().replace(/\s+/g, " ");
  const startsSentence = !leadIn || /[.?!]["')\]]?$/.test(leadIn);
  if (startsSentence && parts[0].before) {
    parts[0] = { ...parts[0], before: parts[0].before[0].toUpperCase() + parts[0].before.slice(1) };
  }
  return { leadIn, parts };
}

/** Punctuation after part `index` of `count`: "a.", "a, or b.", "a, b, or c." */
export function separatorAfter(index: number, count: number): string {
  if (index === count - 1) return ".";
  if (index === count - 2) return ", or ";
  return ", ";
}
