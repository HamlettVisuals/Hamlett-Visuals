"use client";

import { useState, type CSSProperties } from "react";
import type { Category } from "@/payload-types";
import { BOOKING_HOW_IT_WORKS } from "@/lib/booking-copy";
import BookingForm, { type BookingCopy } from "./BookingForm";

// The "How it works" box and the booking form, which share one piece of
// state: whether a request has been sent. Once it has, the box goes away
// and the thank-you (BookingForm's success panel) sits under the page
// heading on its own.

export type Step = { title: string; description: string };

// Steps per row from tablet up: all of them up to three, two for four (a
// 2×2), then three. Stacked on phones.
const columnsFor = (count: number) => (count <= 3 ? count : count === 4 ? 2 : 3);

export default function BookingFlow({
  categories,
  fallbackCategoryId,
  browsableSlugs,
  steps,
  copy,
}: {
  categories: Category[];
  fallbackCategoryId: number | undefined;
  browsableSlugs: string[];
  steps: Step[];
  copy: BookingCopy & { howItWorks?: string | null };
}) {
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const columns = Math.max(1, columnsFor(steps.length));

  const handleSubmitted = (name: string) => {
    setFirstName(name);
    setSubmitted(true);
  };

  return (
    <>
      {/* .accent-frame is the Offers section's accent-bordered look for the
          Hot offer (see src/app/globals.css), reused here without
          .offer-row-featured's hover-lift since this box isn't clickable;
          the form below wears the same frame so the two match. */}
      {!submitted && (
        <section className="mt-16 accent-frame">
          <h2 className="font-display text-heading text-ink">{copy.howItWorks?.trim() || BOOKING_HOW_IT_WORKS}</h2>
          <ol
            className="booking-steps mt-8 grid"
            style={{ "--booking-step-columns": columns } as CSSProperties}
          >
            {steps.map((step, index) => {
              const firstInRow = index % columns === 0;
              const lastInRow = index % columns === columns - 1 || index === steps.length - 1;
              const inFirstRow = index < columns;
              return (
                <li
                  key={`${index}-${step.title}`}
                  // Stacked (below `sm`): a hairline between steps with 32px
                  // either side. From `sm`: columns divided by hairlines, and
                  // a hairline above every row after the first.
                  className={`border-t border-hairline pt-8 pb-8 first:border-t-0 first:pt-0 last:pb-0 sm:pb-0 ${
                    inFirstRow ? "sm:border-t-0 sm:pt-0" : "sm:mt-8 sm:pt-8"
                  } ${firstInRow ? "" : "sm:border-l sm:pl-8"} ${lastInRow ? "" : "sm:pr-8"}`}
                >
                  <span className="font-display text-title text-accent-text">{index + 1}</span>
                  <h3 className="mt-2 text-body font-medium text-ink">{step.title}</h3>
                  <p className="mt-1 text-caption text-muted">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <BookingForm
        categories={categories}
        fallbackCategoryId={fallbackCategoryId}
        browsableSlugs={browsableSlugs}
        copy={copy}
        submitted={submitted}
        firstName={firstName}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}
