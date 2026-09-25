"use client";

import Link from "next/link";
import { buildContactLine } from "@/lib/booking-contact-line";
import { contactDetails } from "@/lib/contact-details";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { BookingCta as BookingCtaGlobal, SiteSetting } from "@/payload-types";

// Booking CTA section (#booking-cta), between Offers & pricing and Instagram.
// A short centered band that just prompts the next step — deliberately the
// quietest section on the page: no image, no background fill, flat canvas,
// hairline above and below. The only emphasis is the single solid button, so
// it never competes with the Hero or the Featured offer.
//
// Heading/subheading/CTA come from the Booking CTA global (see
// globals/BookingCta.ts), as do the contact line's text and which details
// it links to; the email, phone and Instagram themselves come from Site
// Settings — shared with the Footer and the homepage Instagram section. The
// line is her text followed by the links (lib/booking-contact-line.ts).
// Two separate globals render here, so two separate (scoped) Live Preview
// subscriptions — same pattern as Footer.tsx.

export default function BookingCta({
  bookingCta,
  siteSettings,
}: {
  bookingCta: BookingCtaGlobal;
  siteSettings: SiteSetting;
}) {
  const { data } = useScopedLivePreview<BookingCtaGlobal>({
    initialData: bookingCta,
    serverURL,
    globalSlug: "booking-cta",
    apiRoute: "/hv-studio/api",
  });
  const { data: settings } = useScopedLivePreview<SiteSetting>({
    initialData: siteSettings,
    serverURL,
    globalSlug: "site-settings",
    apiRoute: "/hv-studio/api",
  });

  const contactLine = buildContactLine(
    data.contactLeadIn,
    data,
    contactDetails(settings),
  );

  return (
    <section id="booking-cta" className="border-y border-hairline bg-canvas-tint">
      <div className="mx-auto max-w-2xl px-gutter py-section text-center">
        <h2 className="font-display text-heading text-ink">
          {data.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body text-muted">
          {data.subheading}
        </p>

        <div className="mt-8">
          <Link href={data.ctaHref || "/booking"} className="btn">
            {data.ctaLabel || "Book a session"}
          </Link>
        </div>

        {contactLine && (
          // Her text on its own line, then each link on a line of its own,
          // centred, at every width.
          <div className="mt-4 flex flex-col items-center gap-0.5 text-caption text-muted">
            {contactLine.text && <p className={contactLine.links.length ? "mb-0.5" : ""}>{contactLine.text}</p>}
            {contactLine.links.map((link) => (
              <a
                key={link.kind}
                href={link.href}
                className="link text-ink"
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.text}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
