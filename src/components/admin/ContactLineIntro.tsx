"use client";

import Link from "next/link";
import { useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// Heads a group of contact switches (ContactSwitchField.tsx) — the Booking
// CTA's contact line (globals/BookingCta.ts) and the footer's contact block
// (globals/FinalCtaFooter.ts) — and points to Site Settings, the one place
// the email, phone and Instagram are edited. The heading and first sentence
// come from the ui field's `admin.custom` ({ title, text }); Booking uses
// the defaults below.

type Custom = { title?: string; text?: string };

export default function ContactLineIntro({ field }: { field?: { admin?: { custom?: Custom } } }) {
  const { config } = useConfig();
  const href = formatAdminURL({ adminRoute: config.routes.admin, path: "/globals/site-settings" });
  const custom = field?.admin?.custom ?? {};
  return (
    <div className="field-type contact-line-intro">
      <h3 className="contact-line-intro__title">{custom.title ?? "Contact line"}</h3>
      <p className="contact-line-intro__note">
        {custom.text ??
          "The lines under the button: your text, followed by your contact details as links, one per line."}{" "}
        Your email, Instagram and phone come from{" "}
        <Link href={href as `/${string}`} prefetch={false}>
          Site Settings
        </Link>
        .
      </p>
    </div>
  );
}
