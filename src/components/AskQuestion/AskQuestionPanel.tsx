"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { submitInquiry, type InquiryInput } from "@/lib/inquiries";

// The expandable form FloatingAskButton mounts when open. "closed" is owned
// by the parent (it simply doesn't render this component); once mounted,
// this component runs its own open → submitting → success | error machine.
type Status = "open" | "submitting" | "success" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Elements the Tab-trap cycles between. Excludes disabled fields (submitting)
// and anything explicitly pulled out of the tab order via tabindex="-1" —
// namely the honeypot below, which must never be a stop here.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled])';

type FormErrors = {
  name?: string;
  email?: string;
  message?: string;
};

function validate(fields: {
  name: string;
  email: string;
  message: string;
}): FormErrors {
  const errors: FormErrors = {};
  if (!fields.name.trim()) errors.name = "Enter your name.";
  if (!fields.email.trim()) {
    errors.email = "Enter your email.";
  } else if (!EMAIL_PATTERN.test(fields.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!fields.message.trim()) errors.message = "Enter a message.";
  return errors;
}

export default function AskQuestionPanel({
  onClose,
  triggerRef,
}: {
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const fieldId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>("open");

  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Captured once, at mount — the page the panel was opened from, per the
  // future inquiries table's source_page column. The panel is unmounted on
  // route change (FloatingAskButton), so this never goes stale in place.
  const pathname = usePathname();
  const sourcePageRef = useRef(pathname);

  // Closing always hands focus back to whatever had it before the panel
  // opened — the FloatingAskButton trigger, passed in via triggerRef.
  const handleClose = () => {
    triggerRef.current?.focus();
    onClose();
  };

  // Focus the first field once, on mount — not on every re-render, so
  // nothing steals focus back from the user mid-edit.
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Esc closes (via handleClose, above). Tab/Shift+Tab traps focus inside
  // the panel: at the last focusable element Tab wraps to the first, and at
  // the first Shift+Tab wraps to the last, so focus never escapes to the
  // page behind the panel. Focusable elements are re-queried on every
  // keypress rather than cached, since which fields are enabled changes
  // (submitting) and so does which elements exist (form vs. success view).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const submitting = status === "submitting";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate({ name, email, message });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = nextErrors.name
        ? nameRef.current
        : nextErrors.email
          ? emailRef.current
          : messageRef.current;
      firstInvalid?.focus();
      return;
    }

    // Real users never fill this in — a bot that does gets a silent,
    // convincing "success" with no real submitInquiry call underneath.
    const isSpam = Boolean(
      new FormData(event.currentTarget).get("company"),
    );

    setStatus("submitting");

    if (isSpam) {
      setStatus("success");
      return;
    }

    try {
      const payload: InquiryInput = {
        type: "question",
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        source_page: sourcePageRef.current,
      };
      const result = await submitInquiry(payload);
      setStatus(result.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      ref={panelRef}
      id="ask-question-panel"
      role="dialog"
      aria-label="Ask a question"
      className="ask-panel"
    >
      {status === "success" ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-display italic text-title text-ink">
            Thank you.
          </h2>
          <p className="text-body text-muted">
            Your question has been sent. We typically reply within 1–2
            business days.
          </p>
          <button type="button" onClick={handleClose} className="btn mt-3">
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div>
            <h2 className="font-display italic text-title text-ink">
              Ask a question
            </h2>
            <p className="mt-1 text-caption text-muted">
              We typically reply within 1–2 business days.
            </p>
          </div>

          <div>
            <label htmlFor={`${fieldId}-name`} className="field-label">
              Name
            </label>
            <input
              type="text"
              id={`${fieldId}-name`}
              name="name"
              ref={nameRef}
              value={name}
              disabled={submitting}
              autoComplete="name"
              onChange={(event) => {
                setName(event.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={`field-input ${errors.name ? "border-accent-text" : ""}`}
            />
            {errors.name && (
              <p className="mt-2 text-caption text-accent-text">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${fieldId}-email`} className="field-label">
              Email
            </label>
            <input
              type="email"
              id={`${fieldId}-email`}
              name="email"
              ref={emailRef}
              value={email}
              disabled={submitting}
              autoComplete="email"
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={`field-input ${errors.email ? "border-accent-text" : ""}`}
            />
            {errors.email && (
              <p className="mt-2 text-caption text-accent-text">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${fieldId}-message`} className="field-label">
              Message
            </label>
            <textarea
              id={`${fieldId}-message`}
              name="message"
              ref={messageRef}
              value={message}
              disabled={submitting}
              onChange={(event) => {
                setMessage(event.target.value);
                setErrors((prev) => ({ ...prev, message: undefined }));
              }}
              className={`field-input ${errors.message ? "border-accent-text" : ""}`}
            />
            {errors.message && (
              <p className="mt-2 text-caption text-accent-text">
                {errors.message}
              </p>
            )}
          </div>

          {/* Honeypot — off-screen (not display:none) so simple bots that
              skip display:none fields still find and fill it, while real
              users never see it. Unlike BookingForm's (still-unwired)
              honeypot, this one backs a real focus trap, so it also carries
              tabIndex={-1} — pulled out of the tab order entirely (and out
              of FOCUSABLE_SELECTOR above) rather than just visually hidden,
              so a sighted keyboard user can never land on it. Checked on
              submit above. */}
          <div className="visually-hidden">
            <label htmlFor={`${fieldId}-company`}>Company</label>
            <input
              type="text"
              id={`${fieldId}-company`}
              name="company"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {status === "error" && (
            <p className="text-caption text-accent-text">
              Something went wrong. Please try again.
            </p>
          )}

          <button
            type="submit"
            className="btn"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                Sending
                <span className="btn-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </>
            ) : status === "error" ? (
              "Try again"
            ) : (
              "Send"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
