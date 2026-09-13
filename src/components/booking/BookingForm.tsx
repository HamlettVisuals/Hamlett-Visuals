"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/lib/categories";
import DatePicker from "./DatePicker";

// The booking form itself, plus the success state it swaps to in place after
// submit. Client component: it reads the `?type=` query param to pre-fill
// the session-type field (see the entry points in
// src/components/home/OfferActions.tsx), and owns the (purely local, for
// now) submit → success-state swap.
//
// No backend wiring yet — submitting just reads the name off the form and
// flips to the success state. A future API route is the next step; the
// honeypot field below is already in the DOM/form for it to check later, but
// nothing reads it yet.
//
// Direct-contact details live only in the site-wide Footer (rendered right
// below this page) — deliberately not repeated here.
//
// Validation: the form carries noValidate, so the browser's own "Please fill
// out this field" bubbles never show. Session type / Name / Email are
// checked in JS on submit instead, and a failure renders a quiet inline
// message below the field (see FormErrors below) rather than blocking with
// native UI.

// Outside the real category slugs on purpose, so it can never collide with one.
const OTHER_SESSION_TYPE = "other";

const TIME_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "", label: "No preference" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = {
  sessionType?: string;
  name?: string;
  email?: string;
};

function validate(fields: {
  sessionType: string;
  name: string;
  email: string;
}): FormErrors {
  const errors: FormErrors = {};
  if (!fields.sessionType) errors.sessionType = "Choose a session type.";
  if (!fields.name.trim()) errors.name = "Enter your name.";
  if (!fields.email.trim()) {
    errors.email = "Enter your email.";
  } else if (!EMAIL_PATTERN.test(fields.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
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
  const [date, setDate] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const formSectionRef = useRef<HTMLDivElement>(null);
  const sessionTypeRef = useRef<HTMLSelectElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

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
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");

    const nextErrors = validate({ sessionType, name, email });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = nextErrors.sessionType
        ? sessionTypeRef.current
        : nextErrors.name
          ? nameRef.current
          : emailRef.current;
      firstInvalid?.focus();
      return;
    }

    setFirstName(name.trim().split(/\s+/)[0] ?? "");
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
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-8 bg-canvas-raised p-6 sm:p-8"
        >
          <p className="text-caption text-muted">
            <span className="text-accent-text">*</span> Required
          </p>

          <div>
            <label htmlFor="sessionType" className="field-label">
              Session type <span className="text-accent-text">*</span>
            </label>
            <select
              id="sessionType"
              name="sessionType"
              ref={sessionTypeRef}
              required
              value={sessionType}
              onChange={(event) => {
                setSessionType(event.target.value);
                setPrefilled(false);
                setErrors((prev) => ({ ...prev, sessionType: undefined }));
              }}
              className={`field-input ${errors.sessionType ? "border-accent-text" : ""}`}
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
            {errors.sessionType && (
              <p className="mt-2 text-caption text-accent-text">
                {errors.sessionType}
              </p>
            )}
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
                <DatePicker id="date" name="date" value={date} onChange={setDate} />
              </div>
              <div>
                <label htmlFor="time" className="field-label">
                  Preferred time
                </label>
                <select
                  id="time"
                  name="time"
                  defaultValue=""
                  className="field-input"
                >
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
                Name <span className="text-accent-text">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                ref={nameRef}
                required
                autoComplete="name"
                onChange={() =>
                  setErrors((prev) => ({ ...prev, name: undefined }))
                }
                className={`field-input ${errors.name ? "border-accent-text" : ""}`}
              />
              {errors.name && (
                <p className="mt-2 text-caption text-accent-text">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="field-label">
                Email <span className="text-accent-text">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                ref={emailRef}
                required
                autoComplete="email"
                onChange={() =>
                  setErrors((prev) => ({ ...prev, email: undefined }))
                }
                className={`field-input ${errors.email ? "border-accent-text" : ""}`}
              />
              {errors.email && (
                <p className="mt-2 text-caption text-accent-text">
                  {errors.email}
                </p>
              )}
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
                Prefer DMs? Add your @handle
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
            <input type="text" id="website" name="website" autoComplete="off" />
          </div>

          <div>
            <button type="submit" className="btn">
              Send your request
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
