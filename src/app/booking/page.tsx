import Link from "next/link";
import { Suspense } from "react";
import BookingFlow from "@/components/booking/BookingFlow";
import { getCategories } from "@/lib/categories";

// Booking page. Intro, then BookingFlow — a client component wrapping the
// 3-step "how it works" card and the booking form together, since the card
// turns into a progress tracker once the form is submitted and needs to
// share that state with it (see src/components/booking/BookingFlow.tsx).
// UI only: submitting shows the success state locally: no Supabase, no
// email delivery, no API route yet.

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

      <Suspense fallback={null}>
        <BookingFlow categories={categories} steps={steps} />
      </Suspense>

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
