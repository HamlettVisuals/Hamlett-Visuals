import Link from "next/link";
import { Suspense } from "react";
import BookingForm from "@/components/booking/BookingForm";
import { getCategories } from "@/lib/categories";

// Booking page. Intro + a 3-step "how it works" overview, then the booking
// form itself (client component — see src/components/booking/BookingForm.tsx
// for the pre-fill / success-state behaviour). UI only: submitting shows the
// success state locally: no Supabase, no email delivery, no API route yet.

export const metadata = {
  title: "Book a session — Hamlett Visuals",
};

// Genuinely a sequence, so numbering it is the one place on the site that's
// allowed (see DESIGN.md → Anti-cliché guardrails).
const steps = [
  {
    title: "Pick a date",
    description:
      "Have a date in mind, or leave it open — either works to start.",
  },
  {
    title: "Share the details",
    description:
      "Tell her the session type, who's involved, and what you're picturing.",
  },
  {
    title: "She confirms",
    description:
      "She follows up within a day or two to confirm availability and lock it in.",
  },
];

export default function BookingPage() {
  const categories = getCategories();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-gutter py-section">
      <header>
        <h1 className="font-display text-page text-ink">Book a session</h1>
        <p className="mt-3 max-w-measure text-body text-muted">
          Tell her a little about what you have in mind and she&rsquo;ll
          follow up to work out the rest.
        </p>
      </header>

      {/* .offer-row-featured is the Offers section's accent-bordered treatment
          for the Featured/Hot offer (see src/app/globals.css) — reused as-is
          here as this page's one deliberate accent moment. */}
      <section className="mt-16 offer-row-featured">
        <h2 className="font-display text-heading text-ink">How it works</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="font-display text-title text-accent-text">
                {index + 1}
              </span>
              <h3 className="mt-2 text-body font-medium text-ink">
                {step.title}
              </h3>
              <p className="mt-1 text-caption text-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <Suspense fallback={null}>
        <BookingForm categories={categories} />
      </Suspense>

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
