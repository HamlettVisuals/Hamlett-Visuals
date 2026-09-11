// Terms section (#terms). One flat, sharp-cornered hairline box holding the
// booking policy — the site's plain border language (no accent, no glow; that
// treatment is scoped to the Hot offer card). Stays on plain --color-canvas.
//
// TODO: every clause below is placeholder photography-business boilerplate,
// here so the section has real-looking content to lay out — replace with her
// actual deposit / cancellation / delivery / usage terms before launch. Once
// finalised, the offer fine print (<OfferTerms>) should point at this section
// rather than carrying its own copy.

const clauses = [
  {
    heading: "Booking & deposits",
    body: "A 50% deposit reserves your date; the balance is due on the day of the shoot. Dates are not held without a deposit.",
  },
  {
    heading: "Cancellations & rescheduling",
    body: "Cancel 7 or more days ahead for a full refund of the deposit; within 7 days the deposit is retained. One free reschedule per booking, subject to availability.",
  },
  {
    heading: "Delivery",
    body: "Edited galleries are delivered within four weeks of the shoot. Most shoots also include a sneak-peek set within 48 hours.",
  },
  {
    heading: "Usage rights",
    body: "Clients receive a print release for personal use. Commercial use, resale, or licensing to third parties needs a separate agreement. Hamlett Visuals keeps copyright and may show selected images in its portfolio and on social media unless agreed otherwise in writing.",
  },
  {
    heading: "Weather",
    body: "Outdoor shoots affected by weather are rescheduled to the next mutually available date at no charge.",
  },
];

export default function Terms() {
  return (
    <section id="terms" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">Terms</h2>

        <div className="mt-8 border border-hairline p-6 sm:p-8">
          <div className="flex max-w-measure flex-col gap-6">
            {clauses.map((clause) => (
              <div key={clause.heading}>
                <h3 className="text-body text-ink">{clause.heading}</h3>
                <p className="mt-1 text-body text-muted">{clause.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
