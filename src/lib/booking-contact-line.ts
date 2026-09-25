import type { ContactDetails } from "@/lib/contact-details";

// The Booking CTA's contact line (components/home/BookingCta.tsx): her own
// text from the Booking CTA editor, then whichever contacts are switched on
// there AND filled in on Site Settings, as links in the order email, phone,
// Instagram. All the wording is hers; the site adds nothing but the links
// and the dividers between them. Empty text shows just the links, no
// contacts shows just the text, and with neither the line is left out.

export type ContactLink = {
  kind: "email" | "phone" | "instagram";
  text: string;
  href: string;
  external: boolean;
};

export type ContactLine = {
  text: string;
  links: ContactLink[];
};

export type ContactSwitches = {
  showEmail?: boolean | null;
  showPhone?: boolean | null;
  showInstagram?: boolean | null;
};

export function buildContactLine(
  rawText: string | null | undefined,
  switches: ContactSwitches,
  details: ContactDetails,
): ContactLine | null {
  const links: ContactLink[] = [];
  if (switches.showEmail !== false && details.email) {
    links.push({ kind: "email", text: details.email, href: `mailto:${details.email}`, external: false });
  }
  if (switches.showPhone !== false && details.phone) {
    links.push({ kind: "phone", text: details.phone.display, href: details.phone.href, external: false });
  }
  if (switches.showInstagram !== false && details.instagram) {
    links.push({ kind: "instagram", text: details.instagram.handle, href: details.instagram.url, external: true });
  }
  const text = (rawText ?? "").trim().replace(/\s+/g, " ");
  return text || links.length ? { text, links } : null;
}
