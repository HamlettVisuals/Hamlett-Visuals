import Link from "next/link";
import { instagram } from "@/lib/site-content";

// Booking CTA section (#booking-cta), between Offers & pricing and Instagram.
// A short centered band that just prompts the next step — deliberately the
// quietest section on the page: no image, no background fill, flat canvas,
// hairline above and below. The only emphasis is the single solid button, so
// it never competes with the Hero or the Featured offer.
//
// The Instagram handle comes from the shared `instagram` constant (also used
// by the Footer and the Instagram section). The email is still a placeholder.
// TODO: swap the placeholder headline, supporting line, and email for real
// copy before launch.

export default function BookingCta() {
  return (
    <section id="booking-cta" className="border-y border-hairline">
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
          <a href="mailto:hello@example.com" className="link text-ink">
            hello@example.com
          </a>
          , or find me at{" "}
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link text-ink"
          >
            {instagram.handle}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
