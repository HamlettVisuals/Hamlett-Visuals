// The studio's contact details as the site shows them, all from the Site
// Settings global (globals/SiteSettings.ts): email, Instagram handle and an
// optional phone number. One place turns what she typed into what the site
// renders — "@handle" and the profile link, "(555) 123-4567" and its tel:
// link — and the same rules validate the Site Settings fields, so anything
// that saves also displays. Used by the Footer, the Booking CTA, the homepage
// Instagram section. Live Preview
// hands the components unsaved form values, so they run these too rather
// than trusting the stored text.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only (here: none) — see the note at the top of that file.

// Instagram usernames: 1–30 letters, numbers, periods and underscores, not
// starting or ending with a period and without two in a row.
const INSTAGRAM_USERNAME = /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/;

/** The bare username from "@name", "name", or a pasted profile link; null if it isn't one. */
export function instagramUsername(raw: string | null | undefined): string | null {
  let value = (raw ?? "").trim();
  if (!value) return null;
  const fromUrl = value.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)\/?(?:[?#].*)?$/i);
  if (fromUrl) value = fromUrl[1];
  value = value.replace(/^@/, "");
  return INSTAGRAM_USERNAME.test(value) ? value : null;
}

export function validateInstagramHandle(raw: string | null | undefined): true | string {
  if (!(raw ?? "").trim()) return true;
  return instagramUsername(raw)
    ? true
    : "Enter your Instagram username, e.g. @hamlettvisuals (letters, numbers, periods and underscores).";
}

export type InstagramLink = { handle: string; url: string };

export function instagramLink(raw: string | null | undefined): InstagramLink | null {
  const username = instagramUsername(raw);
  return username
    ? { handle: `@${username}`, url: `https://www.instagram.com/${username}/` }
    : null;
}

export type PhoneLink = { display: string; href: string };

/**
 * A US number (10 digits, optionally with a leading 1 or +1) shows as
 * "(555) 123-4567"; any other country needs a leading "+" and its country
 * code, and keeps her spacing.
 * Null if it isn't a usable number.
 */
export function phoneLink(raw: string | null | undefined): PhoneLink | null {
  const value = (raw ?? "").trim();
  if (!value || !/^\+?[\d\s().-]+$/.test(value)) return null;
  const international = value.startsWith("+");
  const digits = value.replace(/\D/g, "");

  const us =
    (!international && digits.length === 10) ||
    (digits.length === 11 && digits.startsWith("1"))
      ? digits.slice(-10)
      : null;
  if (us) {
    if (/^[01]/.test(us)) return null; // US area codes never start with 0 or 1
    return {
      display: `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`,
      href: `tel:+1${us}`,
    };
  }

  // +1 is the US/Canada code, so anything else starting with it is a typo.
  if (!international || digits.startsWith("1") || digits.length < 8 || digits.length > 15) {
    return null;
  }
  // Where the country code ends isn't knowable without a numbering-plan
  // library, so her own spacing is kept (dots, dashes and brackets become
  // spaces).
  const display = `+${value.slice(1).replace(/[().-]/g, " ").replace(/\s+/g, " ").trim()}`;
  return { display, href: `tel:+${digits}` };
}

export function validatePhone(raw: string | null | undefined): true | string {
  if (!(raw ?? "").trim()) return true;
  return phoneLink(raw)
    ? true
    : "Enter a 10-digit US number like 555 123 4567. For other countries, start with + and the country code, e.g. +44 20 7946 0958.";
}

type SettingsLike = {
  contact?: { email?: string | null; phone?: string | null } | null;
  instagram?: { handle?: string | null } | null;
};

export type ContactDetails = {
  email: string | null;
  instagram: InstagramLink | null;
  phone: PhoneLink | null;
};

/** What the site shows for each contact detail; null where it's blank or unusable. */
export function contactDetails(settings: SettingsLike | null | undefined): ContactDetails {
  const email = settings?.contact?.email?.trim();
  return {
    email: email && email.includes("@") ? email : null,
    instagram: instagramLink(settings?.instagram?.handle),
    phone: phoneLink(settings?.contact?.phone),
  };
}
