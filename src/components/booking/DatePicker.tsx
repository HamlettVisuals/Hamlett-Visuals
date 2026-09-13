"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

// A typeable mm/dd/yyyy field with a single-month calendar popover for the
// booking form's "Preferred date" — replacing the native <input type="date">,
// whose calendar popup can't be styled to match the site. This is the visual
// approach from the project's earlier availability-picker concept,
// simplified: there's no booked/available state to track yet, so every
// future date is selectable and every past date is just disabled/greyed.
//
// The text input and the popover are two independent ways to set the same
// value — typing doesn't open the popover (only the calendar icon button
// does), and picking a day in the popover updates the typed text to match.
// A typed date only commits (calling onChange) once it's confirmed valid on
// blur or Enter; an invalid or incomplete value shows an inline error
// instead, in the same quiet style used for Name/Email/Session type, and
// leaves the last committed value alone.
//
// Renders a hidden `<input name={name}>` so the surrounding <form>'s
// FormData still carries the value under the same field name the native
// input used — a component swap, not a data-shape change.

export type DatePickerProps = {
  id: string;
  name: string;
  value: string; // ISO yyyy-mm-dd, or "" for no selection
  onChange: (value: string) => void;
  className?: string;
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// How far the month/year quick-jump lets someone go — no need to support
// arbitrarily distant future dates, just painless navigation a year or two out.
const MAX_YEARS_AHEAD = 2;

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string): Date | null {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

function formatTyped(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

// Parses a complete "mm/dd/yyyy" string into a real calendar date, rejecting
// out-of-range values (month 13, Feb 30, etc.) that Date's own rollover
// would otherwise silently "fix" into a different date.
function parseTyped(text: string): Date | null {
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type GridCell = { date: Date } | null;

function buildMonthGrid(monthStart: Date): GridCell[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = monthStart.getDay();

  const cells: GridCell[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DatePicker({
  id,
  name,
  value,
  onChange,
  className = "",
}: DatePickerProps) {
  const today = startOfDay(new Date());
  const selected = value ? parseISODate(value) : null;

  const [text, setText] = useState(() => (selected ? formatTyped(selected) : ""));
  const [error, setError] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [showMonthYear, setShowMonthYear] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Keep the typed text in sync with the committed value whenever it changes
  // from outside a keystroke — picking a day in the popover, or a typed
  // value normalizing (e.g. "9/5/2026" → "09/05/2026") once it commits.
  // Adjusted during render (React's documented pattern for state that
  // mirrors a prop) rather than in an effect, so there's no extra render.
  const [lastSyncedValue, setLastSyncedValue] = useState(value);
  if (value !== lastSyncedValue) {
    setLastSyncedValue(value);
    setText(selected ? formatTyped(selected) : "");
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const iconButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        iconButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) popoverRef.current?.focus();
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) setShowMonthYear(false);
  };

  const isViewingCurrentMonth =
    viewMonth.getFullYear() === today.getFullYear() &&
    viewMonth.getMonth() === today.getMonth();
  const isViewingCurrentYear = viewMonth.getFullYear() === today.getFullYear();
  const isViewingMaxYear = viewMonth.getFullYear() >= today.getFullYear() + MAX_YEARS_AHEAD;

  const cells = buildMonthGrid(viewMonth);

  const selectDate = (date: Date) => {
    setError(undefined);
    onChange(toISODate(date));
    setOpen(false);
    iconButtonRef.current?.focus();
  };

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    let digits = raw.replace(/\D/g, "");

    // A backspace that only removes an auto-inserted "/" would otherwise
    // reappear immediately on reformat — drop one more digit so deleting
    // feels natural right after a separator.
    if (raw.length < text.length) {
      const previousDigits = text.replace(/\D/g, "");
      if (digits.length === previousDigits.length && digits.length > 0) {
        digits = digits.slice(0, -1);
      }
    }
    digits = digits.slice(0, 8);

    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    setText(formatted);
    setError(undefined);
  };

  const commitTyped = () => {
    if (text.trim() === "") {
      setError(undefined);
      if (value) onChange("");
      return;
    }

    const parsed = parseTyped(text);
    if (!parsed) {
      setError("Enter a valid date (mm/dd/yyyy).");
      return;
    }
    if (startOfDay(parsed) < today) {
      setError("Choose a date that hasn't passed.");
      return;
    }

    setError(undefined);
    setViewMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    onChange(toISODate(parsed));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitTyped();
    }
  };

  const handleTextBlur = () => {
    commitTyped();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="mm/dd/yyyy"
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onBlur={handleTextBlur}
        onFocus={() => setOpen(false)}
        className={`field-input pr-10 ${error ? "border-accent-text" : ""}`}
      />
      <button
        type="button"
        ref={iconButtonRef}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label="Open calendar"
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-muted transition-colors duration-150 ease-standard hover:text-ink"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
          <rect
            x="2"
            y="3.25"
            width="12"
            height="10.75"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M2 6.5h12M5.5 1.75v2.75M10.5 1.75v2.75"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {error && (
        <p className="mt-2 text-caption text-accent-text">{error}</p>
      )}

      {open && (
        <div
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          aria-label="Choose a date"
          tabIndex={-1}
          className="absolute left-0 top-full z-20 mt-2 w-[280px] rounded-[var(--radius-btn)] border border-hairline bg-canvas p-4 outline-none"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setViewMonth((month) =>
                  showMonthYear
                    ? new Date(month.getFullYear() - 1, month.getMonth(), 1)
                    : new Date(month.getFullYear(), month.getMonth() - 1, 1),
                )
              }
              disabled={showMonthYear ? isViewingCurrentYear : isViewingCurrentMonth}
              aria-label={showMonthYear ? "Previous year" : "Previous month"}
              className="flex h-8 w-8 items-center justify-center text-muted transition-colors duration-150 ease-standard hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
                <path
                  d="M10 3.5 5.5 8l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowMonthYear((isShowing) => !isShowing)}
              aria-expanded={showMonthYear}
              aria-label={
                showMonthYear ? "Back to calendar" : "Choose a month and year"
              }
              className="font-display text-body text-ink transition-colors duration-150 ease-standard hover:text-accent-text"
            >
              {showMonthYear ? viewMonth.getFullYear() : MONTH_FORMATTER.format(viewMonth)}
            </button>
            <button
              type="button"
              onClick={() =>
                setViewMonth((month) =>
                  showMonthYear
                    ? new Date(month.getFullYear() + 1, month.getMonth(), 1)
                    : new Date(month.getFullYear(), month.getMonth() + 1, 1),
                )
              }
              disabled={showMonthYear && isViewingMaxYear}
              aria-label={showMonthYear ? "Next year" : "Next month"}
              className="flex h-8 w-8 items-center justify-center text-muted transition-colors duration-150 ease-standard hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
                <path
                  d="M6 3.5 10.5 8 6 12.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {showMonthYear ? (
            <div className="mt-3 grid grid-cols-3 gap-1">
              {MONTH_LABELS.map((label, index) => {
                const isPast =
                  viewMonth.getFullYear() === today.getFullYear() &&
                  index < today.getMonth();
                const isActive = index === viewMonth.getMonth();
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      setViewMonth(new Date(viewMonth.getFullYear(), index, 1));
                      setShowMonthYear(false);
                    }}
                    className={`rounded-[var(--radius-btn)] py-2 text-caption transition-colors duration-150 ease-standard disabled:cursor-not-allowed disabled:text-muted/40 ${
                      isActive
                        ? "bg-accent-text text-canvas"
                        : "text-ink hover:bg-canvas-tint"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-caption text-muted">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label} className="flex h-7 items-center justify-center">
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {cells.map((cell, index) => {
                  if (!cell) return <span key={`blank-${index}`} />;

                  const isPast = cell.date < today;
                  const isSelected = selected ? isSameDay(cell.date, selected) : false;
                  const isToday = isSameDay(cell.date, today);

                  return (
                    <button
                      key={cell.date.toISOString()}
                      type="button"
                      disabled={isPast}
                      onClick={() => selectDate(cell.date)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-body transition-colors duration-150 ease-standard disabled:cursor-not-allowed disabled:text-muted/40 ${
                        isSelected
                          ? "bg-accent-text text-canvas"
                          : isToday
                            ? "text-accent-text hover:bg-canvas-tint"
                            : "text-ink hover:bg-canvas-tint"
                      }`}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
