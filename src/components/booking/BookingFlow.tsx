"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/payload-types";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import BookingForm from "./BookingForm";

// How long after the previous step's status change the next one appears —
// step 1's checkmark first, step 2's ~STEP_STAGGER_MS later, step 3's accent
// highlight another STEP_STAGGER_MS after that. Zeroed under
// prefers-reduced-motion so every step reflects the submitted state at once.
const STEP_STAGGER_MS = 130;

// Owns the one piece of state the "How it works" card and the booking form
// need to share: whether the form has been successfully submitted. Client
// component so both children can live under it — "How it works" is static
// content otherwise, but once submitted it needs to read the same flag the
// form's success state uses, to turn into a progress tracker (see the step
// rendering below).

export type Step = { title: string; description: string };

export default function BookingFlow({
  categories,
  fallbackCategoryId,
  steps,
}: {
  categories: Category[];
  fallbackCategoryId: number | undefined;
  steps: Step[];
}) {
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const prefersReducedMotion = usePrefersReducedMotion();

  // Submitting collapses the form into a much shorter success block, and
  // the resulting reflow makes the browser jump the page to an
  // unpredictable position (often overshooting toward the footer, since
  // the same scrollTop now lands much further down the now-shorter
  // document) — and that jump isn't necessarily a single, one-time event
  // synchronous with the DOM update; it can keep asserting itself for a
  // short window afterward. Rather than a single deferred scrollTo (which
  // a later competing adjustment can still override), this keeps
  // re-asserting scrollY 0 for half a second, stopping as soon as it
  // actually sticks. `behavior: "auto"` is explicit and load-bearing: the
  // site's global `scroll-behavior: smooth` (globals.css) would otherwise
  // turn this into an animated scroll, fighting each correction with its
  // own in-flight animation instead of landing immediately.
  useEffect(() => {
    if (!submitted) return;

    let attempts = 0;
    const maxAttempts = 10;
    const enforce = () => {
      if (window.scrollY === 0) {
        window.clearInterval(intervalId);
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      attempts += 1;
      if (attempts >= maxAttempts) window.clearInterval(intervalId);
    };

    const intervalId = window.setInterval(enforce, 50);
    enforce();
    return () => window.clearInterval(intervalId);
  }, [submitted]);

  const handleSubmitted = (name: string) => {
    setFirstName(name);
    setSubmitted(true);
  };

  return (
    <>
      {/* .accent-frame is the Offers section's accent-bordered visual
          treatment for the Featured/Hot offer (see src/app/globals.css) —
          reused here, without .offer-row-featured's hover-lift, since this
          card isn't clickable — as this page's one deliberate accent
          moment. Once the form is submitted, the same card doubles as a
          progress tracker: steps 1–2 get a checkmark and a muted heading,
          step 3 (the one still pending — her confirming) gets the accent
          highlight. The three status changes stagger in via
          STEP_STAGGER_MS rather than appearing all at once (see the
          .progress-check-in / .progress-step-heading classes in
          globals.css); collapses to an instant final state under
          prefers-reduced-motion. */}
      <section className="mt-16 accent-frame">
        <h2 className="font-display text-heading text-ink">How it works</h2>
        <ol className="mt-8 grid sm:grid-cols-3">
          {steps.map((step, index) => {
            const isDone = submitted && index < 2;
            const isActive = submitted && index === 2;
            // Step 0's checkmark lands first, step 1's next, step 2's accent
            // highlight last — each `index * STEP_STAGGER_MS` after submit.
            const stepDelay = prefersReducedMotion ? 0 : index * STEP_STAGGER_MS;

            return (
              <li
                key={step.title}
                className={`border-t border-hairline pt-8 first:border-t-0 first:pt-0 sm:border-t-0 sm:pt-0 ${
                  index > 0 ? "sm:border-l sm:pl-8" : ""
                } ${index < steps.length - 1 ? "sm:pr-8" : ""}`}
              >
                {isDone ? (
                  <span
                    role="img"
                    aria-label="Completed"
                    className="progress-check-in flex h-5 w-5 items-center justify-center text-muted"
                    style={{ animationDelay: `${stepDelay}ms` }}
                  >
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-full w-full">
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : (
                  <span className="font-display text-title text-accent-text">
                    {index + 1}
                  </span>
                )}
                <h3
                  className={`progress-step-heading mt-2 text-body font-medium ${
                    isActive ? "text-accent-text" : isDone ? "text-ink opacity-60" : "text-ink"
                  }`}
                  style={isActive ? { transitionDelay: `${stepDelay}ms` } : undefined}
                >
                  {step.title}
                </h3>
                <p className="mt-1 text-caption text-muted">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <BookingForm
        categories={categories}
        fallbackCategoryId={fallbackCategoryId}
        submitted={submitted}
        firstName={firstName}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}
