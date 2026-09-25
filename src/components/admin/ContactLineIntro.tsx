"use client";

import Link from "next/link";
import { useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// Heads the Booking CTA's contact-line fields (globals/BookingCta.ts) and
// points to Site Settings, the one place the email, phone and Instagram
// shown in that line (and in the footer) are edited.
export default function ContactLineIntro() {
  const { config } = useConfig();
  const href = formatAdminURL({ adminRoute: config.routes.admin, path: "/globals/site-settings" });
  return (
    <div className="field-type contact-line-intro">
      <h3 className="contact-line-intro__title">Contact line</h3>
      <p className="contact-line-intro__note">
        The lines under the button: your text, followed by your contact details as links, one per
        line. Your email, Instagram and phone come from{" "}
        <Link href={href as `/${string}`} prefetch={false}>
          Site Settings
        </Link>
        .
      </p>
    </div>
  );
}
