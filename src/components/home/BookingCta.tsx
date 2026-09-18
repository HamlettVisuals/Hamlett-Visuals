"use client";

import Link from "next/link";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { SiteSetting } from "@/payload-types";

// Booking CTA section (#booking-cta), between Offers & pricing and Instagram.
// A short centered band that just prompts the next step — deliberately the
// quietest section on the page: no image, no background fill, flat canvas,
// hairline above and below. The only emphasis is the single solid button, so
// it never competes with the Hero or the Featured offer.
//
// The contact email and Instagram handle come from Site Settings — shared
// with the Footer and the homepage Instagram section.
// TODO: swap the placeholder headline and supporting line for real copy
// before launch.

export default function BookingCta({
  siteSettings,
}: {
  siteSettings: SiteSetting;
}) {
  const { data: settings } = useScopedLivePreview<SiteSetting>({
    initialData: siteSettings,
    serverURL,
    globalSlug: "site-settings",
    apiRoute: "/hv-studio/api",
  });

  const email = settings.contact?.email || "hello@example.com";
  const instagramHandle = settings.instagram?.handle || "@hamlettvisuals";
  const instagramUrl =
    settings.instagram?.url || "https://www.instagram.com/hamlettvisuals/";

  return (
    <section id="booking-cta" className="border-y border-hairline bg-canvas-tint">
      <div className="mx-auto max-w-2xl px-gutter py-section text-center">
        <h2 className="font-display text-heading text-ink">
          Ready when you are
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body text-muted">
          Tell me what you&rsquo;re planning and I&rsquo;ll get back to you
          within a day.
        </p>

        <div className="mt-8">
          <Link href="/booking" className="btn">
            Book a session
          </Link>
        </div>

        <p className="mt-4 text-caption text-muted">
          Prefer to email?{" "}
          <a href={`mailto:${email}`} className="link text-ink">
            {email}
          </a>
          , or find me at{" "}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link text-ink"
          >
            {instagramHandle}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
