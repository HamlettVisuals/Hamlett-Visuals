import Link from "next/link";

// Terms & Conditions — standalone page (formerly the #terms section on
// src/app/privacy-policy/page.tsx, before that the homepage's #terms section
// / src/components/home/Terms.tsx). Placeholder content only; real copy
// comes later. Mirrors the page shell (header, spacing, typography) AND the
// section structure of the sibling /privacy-policy page — plain <h2> Title
// Case sections, no bordered card — so the two documents read as one family.

export const metadata = {
  title: "Terms & Conditions — Hamlett Visuals",
};

// TODO: placeholder "last updated" date — swap for the real date whenever
// the wording is next revised.
const TERMS_LAST_UPDATED = "September 15, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-gutter py-section">
      <header>
        <h1 className="font-display text-page text-ink">
          Terms and conditions
        </h1>
        <p className="mt-3 text-caption text-muted">
          Placeholder copy — final wording pending.
        </p>
        <p className="mt-2 text-caption text-muted">
          Last updated: {TERMS_LAST_UPDATED}
        </p>
      </header>

      <div className="mt-12 flex flex-col gap-10">
        <section>
          <h2 className="font-display text-heading text-ink">
            Booking &amp; Deposits
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            A 50% deposit reserves your date; the balance is due on the day of
            the shoot. Dates are not held without a deposit.
          </p>
        </section>

        <section>
          <h2 className="font-display text-heading text-ink">
            Cancellations &amp; Rescheduling
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            Cancel 7 or more days ahead for a full refund of the deposit;
            within 7 days the deposit is retained. One free reschedule per
            booking, subject to availability.
          </p>
        </section>

        <section>
          <h2 className="font-display text-heading text-ink">Delivery</h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            Edited galleries are delivered within four weeks of the shoot.
            Most shoots also include a sneak-peek set within 48 hours.
          </p>
        </section>

        <section>
          <h2 className="font-display text-heading text-ink">
            Usage Rights
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            Clients receive a print release for personal use. Commercial use,
            resale, or licensing to third parties needs a separate agreement.
            Hamlett Visuals keeps copyright and may show selected images in
            its portfolio and on social media unless agreed otherwise in
            writing.
          </p>
        </section>

        <section>
          <h2 className="font-display text-heading text-ink">Weather</h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            Outdoor shoots affected by weather are rescheduled to the next
            mutually available date at no charge.
          </p>
        </section>
      </div>

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
