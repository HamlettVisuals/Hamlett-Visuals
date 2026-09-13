"use client";

import { useEffect, useId, useRef, useState } from "react";

// A single-month calendar popover for the booking form's "Preferred date"
// field, replacing the native <input type="date"> (whose calendar popup
// can't be styled to match the site). This is the visual approach from the
// project's earlier availability-picker concept, simplified: there's no
// booked/available state to track yet, so every future date is selectable
// and every past date is just disabled/greyed.
//
// Renders a hidden `<input type={name}>` so the surrounding <form>'s
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

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
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

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
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

  const isViewingCurrentMonth =
    viewMonth.getFullYear() === today.getFullYear() &&
    viewMonth.getMonth() === today.getMonth();

  const cells = buildMonthGrid(viewMonth);

  const selectDate = (date: Date) => {
    onChange(toISODate(date));
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        ref={triggerRef}
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        className="field-input flex items-center justify-between gap-2 text-left"
      >
        <span className={selected ? "text-ink" : "text-muted"}>
          {selected ? DAY_LABEL_FORMATTER.format(selected) : "Select a date"}
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted"
        >
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
                setViewMonth(
                  (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1),
                )
              }
              disabled={isViewingCurrentMonth}
              aria-label="Previous month"
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
            <p className="font-display text-body text-ink">
              {MONTH_FORMATTER.format(viewMonth)}
            </p>
            <button
              type="button"
              onClick={() =>
                setViewMonth(
                  (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1),
                )
              }
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center text-muted transition-colors duration-150 ease-standard hover:text-ink"
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
        </div>
      )}
    </div>
  );
}
