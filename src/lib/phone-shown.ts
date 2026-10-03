import type { PayloadRequest } from "payload";

// Whether the contact phone number (Site Settings) shows anywhere on the
// site: the homepage Booking Section and the Footer each have their own
// "Show phone number" switch (on unless turned off), and the Privacy Policy
// follows the Footer's. When every one is off, signed-out API readers don't
// get the number either (SiteSettings.ts). The email always shows (the
// Privacy Policy keeps it), so it isn't covered here.
//
// Part of payload.config.ts's module graph, so no "@/…" imports.

type Switches = { showPhone?: boolean | null } | null | undefined;

/** The rule itself, for the site and the API alike. */
export const phoneShown = (bookingCta: Switches, footer: Switches) =>
  bookingCta?.showPhone !== false || footer?.showPhone !== false;

/** Reads both switches (two small global reads, only for a signed-out API request). */
export async function phoneShownAnywhere(req: PayloadRequest): Promise<boolean> {
  const [bookingCta, footer] = await Promise.all([
    req.payload.findGlobal({ slug: "booking-cta", depth: 0, req }),
    req.payload.findGlobal({ slug: "final-cta-footer", depth: 0, req }),
  ]);
  return phoneShown(bookingCta, footer);
}
