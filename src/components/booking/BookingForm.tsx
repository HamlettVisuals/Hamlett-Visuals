"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/lib/categories";

// The booking form itself, plus the success state it swaps to in place after
// submit and the direct-contact fallback shown beneath it. Client component:
// it reads the `?type=` query param to pre-fill the session-type field (see
// the entry points in src/components/home/OfferActions.tsx), and owns the
// (purely local, for now) submit → success-state swap.
//
// No backend wiring yet — submitting just reads the name off the form and
// flips to the success state. A future API route is the next step; the
// honeypot field below is already in the DOM/form for it to check later, but
// nothing reads it yet.

// Placeholder contact details — mirrors src/components/Footer.tsx exactly.
// TODO: swap both for the real email and phone number before launch.
const EMAIL = "hello@example.com";
const PHONE_DISPLAY = "+0 000 000 0000";
const PHONE_HREF = "tel:+00000000000";

// Outside the real category slugs on purpose, so it can never collide with one.
const OTHER_SESSION_TYPE = "other";

const TIME_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "", label: "No preference" },
];

function ContactLinks() {
  return (
    <div className="flex flex-col gap-1.5 text-caption text-muted">
      <a href={`mailto:${EMAIL}`} className="link">
        {EMAIL}
      </a>
      <a href={PHONE_HREF} className="link">
        {PHONE_DISPLAY}
      </a>
    </div>
  );
}

export default function BookingForm({
  categories,
}: {
  categories: Category[];
}) {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const matchedCategory = categories.find(
    (category) => category.slug === typeParam,
  );

  const [sessionType, setSessionType] = useState(
    matchedCategory ? matchedCategory.slug : "",
  );
  const [prefilled, setPrefilled] = useState(Boolean(matchedCategory));
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");

  const formSectionRef = useRef<HTMLDivElement>(null);

  // Only scroll when the URL actually handed us a real, matched category —
  // an empty/invalid `type` is a normal, silent no-op.
  useEffect(() => {
    if (matchedCategory) {
      formSectionRef.current?.scrollIntoView({ block: "start" });
    }
    // Intentionally run once, on mount, against the param the page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearPrefill = () => {
    setSessionType("");
    setPrefilled(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    setFirstName(name.split(/\s+/)[0] ?? "");
    setSubmitted(true);
  };

  return (
    <div ref={formSectionRef} id="booking-form" className="mt-16">
      {submitted ? (
        <section>
          <h2 className="font-display text-heading text-ink">
            Thanks, {firstName || "there"}.
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            Your request has been sent. She reads every one herself and
            usually replies within a day or two.
          </p>

          <ul className="mt-8 flex flex-col gap-3 text-body text-muted">
            <li className="border-t border-hairline pt-3">
              She&rsquo;ll look over the details you shared.
            </li>
            <li className="border-t border-hairline pt-3">
              She&rsquo;ll follow up to confirm availability and lock in the
              date.
            </li>
          </ul>

          <div className="mt-10 border-t border-hairline pt-8">
            <p className="text-body text-muted">
              Need to reach her sooner?
            </p>
            <ContactLinks />
          </div>
        </section>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div>
              <label htmlFor="sessionType" className="field-label">
                Session type
              </label>
              <select
                id="sessionType"
                name="sessionType"
                required
                value={sessionType}
                onChange={(event) => {
                  setSessionType(event.target.value);
                  setPrefilled(false);
                }}
                className="field-input"
              >
                <option value="" disabled>
                  Select a session type
                </option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
                <option value={OTHER_SESSION_TYPE}>Something else</option>
              </select>
              {prefilled && (
                <p className="mt-2 text-caption text-muted">
                  Pre-filled from the offer you clicked.{" "}
                  <button
                    type="button"
                    onClick={clearPrefill}
                    className="link link-button text-ink"
                  >
                    Change
                  </button>
                </p>
              )}
            </div>

            <div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="date" className="field-label">
                    Preferred date
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    className="field-input"
                  />
                </div>
                <div>
                  <label htmlFor="time" className="field-label">
                    Preferred time
                  </label>
                  <select id="time" name="time" defaultValue="" className="field-input">
                    {TIME_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-2 text-caption text-muted">
                Just a starting point — she&rsquo;ll confirm actual
                availability when she follows up.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="field-label">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  autoComplete="name"
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="email" className="field-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="field-input"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="field-label">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  autoComplete="tel"
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="handle" className="field-label">
                  Prefer DMs? Add your @handle (optional)
                </label>
                <input
                  type="text"
                  id="handle"
                  name="handle"
                  placeholder="@yourhandle"
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="field-label">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                placeholder="Anything you'd like her to know — the occasion, the people involved, a rough headcount, locations you have in mind."
                className="field-input"
              />
            </div>

            {/* Honeypot — off-screen (not display:none) so it stays in the DOM
                for simple bots to fill while real users never see it. Not wired
                to anything yet; a future API route checks it and silently drops
                the submission if it's non-empty. */}
            <div className="visually-hidden">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                autoComplete="off"
              />
            </div>

            <div>
              <button type="submit" className="btn">
                Send your request
              </button>
            </div>
          </form>

          <div className="mt-14 border-t border-hairline pt-8">
            <p className="text-body text-muted">
              Prefer to reach out directly?
            </p>
            <div className="mt-3">
              <ContactLinks />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
