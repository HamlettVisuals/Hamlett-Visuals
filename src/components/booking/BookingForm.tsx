"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams, usePathname } from "next/navigation";
import type { Category } from "@/payload-types";
import { submitInquiry } from "@/lib/inquiries";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import DatePicker from "./DatePicker";

// The booking form itself, plus the success state it swaps to in place after
// submit. Client component: it reads the `?type=` query param to pre-fill
// the session-type field (see the entry points in
// src/components/home/OfferActions.tsx).
//
// `submitted` / `firstName` are owned by the parent (BookingFlow), not this
// component — the "How it works" card above needs the same flag to turn
// into a progress tracker, so it lives one level up instead of being local
// state here. This component just calls `onSubmitted` once a submission is
// valid.
//
// A valid submit posts a real Inquiry (type: "booking") via submitInquiry
// (src/lib/inquiries.ts) — session type, preferred time, and the Instagram
// handle all get folded into the Inquiry's one `message` field (composeMessage
// below) since the collection doesn't have dedicated columns for them. The
// dev-only ?bookingResult=error query param (devForceError below) still
// forces the error path without needing the backend itself to fail, for
// exercising that UI state on demand. The honeypot field skips the
// submitInquiry call entirely and goes straight to success, matching
// AskQuestionPanel's honeypot behavior.
//
// The form→success swap itself (once `submitted` flips true) crossfades
// rather than snapping: both panels stay mounted for
// --booking-swap-duration + --booking-swap-overlap (see globals.css) while
// the container's height animates from the form's measured height to the
// success panel's, then the form unmounts. Skipped entirely under
// prefers-reduced-motion — see swapPhase below.
//
// Direct-contact details live only in the site-wide Footer (rendered right
// below this page) — deliberately not repeated here.
//
// Validation: the form carries noValidate, so the browser's own "Please fill
// out this field" bubbles never show. Session type / Name / Email are
// checked in JS on submit instead, and a failure renders a quiet inline
// message below the field (see FormErrors below) rather than blocking with
// native UI.

// How long the forced-error dev escape hatch (devForceError below) holds the
// button in "Sending…" before rejecting — long enough to read as a real
// network round trip. The button's dots animate on an infinite loop (see
// .btn-dots in globals.css), so nothing here needs to change for the
// indicator to still read naturally at this length.
const SENDING_DELAY_MS = 1400;

function simulateBookingFailure(): Promise<never> {
  return new Promise((_resolve, reject) => {
    window.setTimeout(
      () => reject(new Error("Simulated booking failure")),
      SENDING_DELAY_MS,
    );
  });
}

// Mirrors --booking-swap-duration / --booking-swap-overlap (globals.css) so
// the cleanup timeout below waits exactly as long as the CSS animations take.
const SWAP_DURATION_MS = 250;
const SWAP_OVERLAP_MS = 80;
const SWAP_TOTAL_MS = SWAP_DURATION_MS + SWAP_OVERLAP_MS;

type SwapPhase = "form" | "swapping" | "success";

const TIME_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "", label: "No preference" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUMMARY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// Labels for the one-line confirmation summary on the success panel — looks
// up the category name for a real slug, or the "Something else" copy the
// select itself uses for OTHER_SESSION_TYPE.
function sessionTypeLabel(slug: string, categories: Category[]): string {
  if (slug === OTHER_SESSION_TYPE) return "Something else";
  return categories.find((category) => category.slug === slug)?.name ?? slug;
}

// DatePicker's value is an ISO yyyy-mm-dd string; parsed with explicit
// year/month/day (not `new Date(iso)`) so the summary can't drift a day off
// in timezones behind UTC.
function formatSummaryDate(iso: string): string | null {
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return SUMMARY_DATE_FORMATTER.format(new Date(year, month - 1, day));
}

function timeLabel(value: string): string | null {
  const match = TIME_OPTIONS.find((option) => option.value === value);
  return match && match.value ? match.label : null;
}

// DatePicker's plain "yyyy-mm-dd" would be read by `new Date(...)` as UTC
// midnight, which can display as the day before once Payload's admin
// renders it in a timezone behind UTC (confirmed: 10/15 submitted showed as
// 10/14 in /hv-studio). Pinning to noon UTC keeps the calendar date stable
// across every real-world timezone offset — same reasoning as
// formatSummaryDate above parsing explicit year/month/day instead of
// `new Date(iso)`.
function toPreferredDateISO(iso: string): string | undefined {
  if (!iso) return undefined;
  return `${iso}T12:00:00.000Z`;
}

// The Inquiries collection has one free-text `message` field — no dedicated
// columns for session type, preferred time, or Instagram handle — so those
// get folded into it here, ahead of whatever the client actually typed, so
// none of it is lost for the person reading the inbox.
function composeMessage(fields: {
  sessionType: string;
  time: string;
  handle: string;
  message: string;
  categories: Category[];
}): string {
  const lines = [
    `Session type: ${sessionTypeLabel(fields.sessionType, fields.categories)}`,
  ];
  const time = timeLabel(fields.time);
  if (time) lines.push(`Preferred time: ${time}`);
  if (fields.handle.trim()) lines.push(`Instagram: ${fields.handle.trim()}`);
  if (fields.message.trim()) lines.push("", fields.message.trim());
  return lines.join("\n");
}

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
  fallbackCategoryId,
  submitted,
  firstName,
  onSubmitted,
}: {
  categories: Category[];
  // The unpublished "Other" Category's id (booking/page.tsx looks it up by
  // slug, unfiltered by `published`) — `categories` itself only ever holds
  // published ones, so "Something else" can't resolve against it directly.
  // Undefined if that category doesn't exist yet.
  fallbackCategoryId: number | undefined;
  submitted: boolean;
  firstName: string;
  onSubmitted: (firstName: string) => void;
}) {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const matchedCategory = categories.find(
    (category) => category.slug === typeParam,
  );

  // Captured once, at mount — see AskQuestionPanel's identical sourcePageRef
  // for why this is a ref rather than read fresh on submit.
  const pathname = usePathname();
  const sourcePageRef = useRef(pathname);

  // Dev-only escape hatch to preview/verify the error state without the
  // backend itself needing to fail — see simulateBookingFailure above. Never
  // true in production.
  const devForceError =
    process.env.NODE_ENV === "development" &&
    searchParams.get("bookingResult") === "error";

  const [sessionType, setSessionType] = useState(
    matchedCategory ? matchedCategory.slug : "",
  );
  const [prefilled, setPrefilled] = useState(Boolean(matchedCategory));
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [summary, setSummary] = useState<{
    sessionType: string;
    date: string;
    time: string;
  } | null>(null);
  const [swapPhase, setSwapPhase] = useState<SwapPhase>(
    submitted ? "success" : "form",
  );

  const prefersReducedMotion = usePrefersReducedMotion();

  const formSectionRef = useRef<HTMLDivElement>(null);
  const successPanelRef = useRef<HTMLElement>(null);
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

  // Kicks off the crossfade the moment `submitted` flips true. Locks the
  // container to its current (form) height in px — it was `auto` — so the
  // height transition below has a real starting value instead of jumping.
  // Reduced motion skips straight to the success phase, no measuring.
  useEffect(() => {
    if (!submitted || swapPhase !== "form") return;

    const beginSwap = () => {
      if (prefersReducedMotion) {
        setSwapPhase("success");
        return;
      }

      const container = formSectionRef.current;
      if (container) {
        container.style.height = `${container.offsetHeight}px`;
        container.style.overflow = "hidden";
      }
      setSwapPhase("swapping");
    };
    beginSwap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  // Once both panels are mounted (swapPhase "swapping"), grow the container
  // to the success panel's natural height — triggering the CSS transition —
  // then, once both the fade and the height animation have finished, drop
  // the form and let the container return to `auto`.
  useLayoutEffect(() => {
    if (swapPhase !== "swapping") return;

    const container = formSectionRef.current;
    const successPanel = successPanelRef.current;
    if (!container || !successPanel) return;

    const targetHeight = successPanel.scrollHeight;
    const frame = requestAnimationFrame(() => {
      container.style.height = `${targetHeight}px`;
    });

    const timeout = window.setTimeout(() => {
      container.style.height = "auto";
      container.style.overflow = "";
      setSwapPhase("success");
    }, SWAP_TOTAL_MS);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [swapPhase]);

  const clearPrefill = () => {
    setSessionType("");
    setPrefilled(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const time = String(data.get("time") ?? "");
    const phone = String(data.get("phone") ?? "");
    const handle = String(data.get("handle") ?? "");
    const message = String(data.get("message") ?? "");
    const street = String(data.get("street") ?? "");
    const city = String(data.get("city") ?? "");
    const state = String(data.get("state") ?? "");

    // Real users never fill this in — a bot that does gets a silent,
    // convincing "success" with no real submitInquiry call underneath.
    const isSpam = Boolean(String(data.get("website") ?? "").trim());

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

    setSubmitError(false);
    setSummary({ sessionType, date, time });

    if (isSpam) {
      onSubmitted(name.trim().split(/\s+/)[0] ?? "");
      return;
    }

    setPending(true);
    try {
      if (devForceError) {
        await simulateBookingFailure();
      }
      const result = await submitInquiry({
        type: "booking",
        inquiryType: "booking",
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: composeMessage({ sessionType, time, handle, message, categories }),
        preferredDate: toPreferredDateISO(date),
        // The session-type select's value is a real Category slug, except
        // OTHER_SESSION_TYPE ("Something else"), which isn't one — `categories`
        // only holds published categories, so it can't resolve that case
        // itself. fallbackCategoryId is the one place that unpublished
        // "Other" record's id comes from; still undefined (and still a
        // real validation error, not a silent bad write) if it hasn't been
        // created yet.
        category:
          sessionType === OTHER_SESSION_TYPE
            ? fallbackCategoryId
            : categories.find((category) => category.slug === sessionType)?.id,
        location: {
          street: street.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        },
        sourcePage: sourcePageRef.current,
      });
      if (!result.success) throw new Error("submitInquiry failed");
      setPending(false);
      onSubmitted(name.trim().split(/\s+/)[0] ?? "");
    } catch {
      setPending(false);
      setSubmitError(true);
    }
  };

  return (
    <div
      ref={formSectionRef}
      id="booking-form"
      className="mt-16 booking-swap"
      style={{ overflowAnchor: "none" }}
    >
      {swapPhase !== "success" && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className={`flex flex-col gap-8 bg-canvas-raised p-6 sm:p-8 ${
            swapPhase === "swapping" ? "booking-swap-leaving" : ""
          }`}
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

          <div>
            <span className="field-label">Location</span>
            <p className="mt-1 text-caption text-muted">
              Know the venue already? Add it here — leave it blank if you&rsquo;re
              still deciding.
            </p>
            <div className="mt-3">
              <label htmlFor="street" className="field-label">
                Street
              </label>
              <input
                type="text"
                id="street"
                name="street"
                autoComplete="street-address"
                className="field-input"
              />
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="field-label">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="state" className="field-label">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  autoComplete="address-level1"
                  className="field-input"
                />
              </div>
            </div>
          </div>

          {/* Honeypot — off-screen (not display:none) so it stays in the DOM
              for simple bots to fill while real users never see it.
              tabIndex={-1} keeps it out of the keyboard tab order for
              sighted keyboard users too. Checked in handleSubmit above. */}
          <div className="visually-hidden">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {submitError && (
            <p className="text-caption text-accent-text">
              Something went wrong. Please try again.
            </p>
          )}

          <div>
            <button type="submit" className="btn" disabled={pending} aria-busy={pending}>
              {pending ? (
                <>
                  Sending
                  <span className="btn-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </>
              ) : submitError ? (
                "Try again"
              ) : (
                "Send your request"
              )}
            </button>
          </div>
        </form>
      )}
      {swapPhase !== "form" && (
        <section
          ref={successPanelRef}
          className={swapPhase === "swapping" ? "booking-swap-entering" : undefined}
        >
          <h2 className="font-display text-heading text-ink">
            Thanks, {firstName || "there"}.
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            Your request has been sent. She reads every one herself and
            usually replies within a day or two.
          </p>
          {summary && (
            <p className="mt-1 text-caption text-muted">
              {[
                sessionTypeLabel(summary.sessionType, categories),
                [formatSummaryDate(summary.date), timeLabel(summary.time)]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join(" — ")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
