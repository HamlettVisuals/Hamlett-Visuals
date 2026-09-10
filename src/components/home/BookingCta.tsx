import Link from "next/link";

// Booking CTA section (#booking-cta), between Offers & pricing and Instagram.
// A short centered band that just prompts the next step — deliberately the
// quietest section on the page: no image, no background fill, flat canvas,
// hairline above and below. The only emphasis is the single solid button, so
// it never competes with the Hero or the Featured offer.
//
// The contact fallback reuses the Footer's placeholder details on purpose —
// keep the two in sync.
// TODO: swap the placeholder headline, supporting line, and contact details
// for real copy before launch.

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
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="link text-ink"
          >
            @hamletvisuals
          </a>
          .
        </p>
      </div>
    </section>
  );
}
