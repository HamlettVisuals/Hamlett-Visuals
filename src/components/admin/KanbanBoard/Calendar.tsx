"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getCategoryColor } from "@/lib/category-colors";
import styles from "./KanbanBoard.module.css";
import { buildMonthGrid, dateKey, WEEKDAY_LABELS, type CalendarDay } from "./calendar-utils";
import { parseCalendarDate } from "./format";
import { inquiryClient, type BoardInquiry } from "./types";

type CalendarEvent = {
  inquiry: BoardInquiry;
  kind: "shoot" | "deadline";
  title: string;
  name: string;
  // Only meaningful for kind === "shoot" — a deliveryDeadline has no
  // equivalent "tentative" state. See Inquiries.ts's shootDateConfirmed and
  // seedShootDateFromPreferred: a shoot date seeded from the client's
  // requested date starts out unconfirmed.
  confirmed: boolean;
};

// Phones, and anything too short for a 6-week grid of labelled events
// (landscape phones): markers in the grid, and the selected day's events
// listed below it.
// Same width cutoff as the board's mobile list (KanbanBoard.module.css).
const COMPACT_QUERY = "(max-width: 768px), (max-height: 500px)";

// The calendar only renders after the Calendar toggle is pressed (never on
// the server), so reading the media query up front can't cause a hydration
// mismatch; the server snapshot is only a formality.
function useCompactLayout(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(COMPACT_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
}

// Buckets every non-archived Inquiry's shootDate and deliveryDeadline onto
// the day it falls on. A record can contribute up to two entries (one per
// date field it has set) — deliberately not deduped against the kanban
// board's one-card-per-record model, since this view is about dates on the
// calendar, not records.
function buildEventsByDate(inquiries: BoardInquiry[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();

  const add = (
    value: string | null | undefined,
    inquiry: BoardInquiry,
    kind: CalendarEvent["kind"],
    title: string,
    name: string,
    confirmed: boolean,
  ) => {
    // parseCalendarDate, not a bare `new Date(value)` — see its own comment
    // in format.ts. Without it, this bucket key could land on the wrong day
    // (and the entry with it) in a timezone behind UTC.
    const date = parseCalendarDate(value);
    if (!date) return;
    const key = dateKey(date);
    const list = map.get(key);
    if (list) {
      list.push({ inquiry, kind, title, name, confirmed });
    } else {
      map.set(key, [{ inquiry, kind, title, name, confirmed }]);
    }
  };

  for (const inquiry of inquiries) {
    const name = inquiryClient(inquiry)?.name ?? inquiry.name;
    add(inquiry.shootDate, inquiry, "shoot", `Shoot — ${name}`, name, Boolean(inquiry.shootDateConfirmed));
    add(inquiry.deliveryDeadline, inquiry, "deadline", `Delivery deadline — ${name}`, name, true);
  }

  return map;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const isTentative = (event: CalendarEvent) => event.kind === "shoot" && !event.confirmed;

const kindLabel = (event: CalendarEvent) =>
  event.kind === "deadline" ? "Delivery deadline" : isTentative(event) ? "Shoot (tentative)" : "Shoot";

// The event's shape in its category's colour — used by the grid chips, the
// compact grid's markers and the selected day's rows alike. Three distinct shapes,
// not just a hover-only distinction: a filled circle (confirmed shoot), an
// outline-only ring (tentative shoot) and a filled diamond (deadline).
function EventMarker({ event }: { event: CalendarEvent }) {
  const color = getCategoryColor(event.inquiry.category.id);
  const tentative = isTentative(event);
  const shapeClass =
    event.kind === "deadline"
      ? styles.calendarEventDiamond
      : tentative
        ? styles.calendarEventRing
        : styles.calendarEventDot;
  return (
    <span
      className={shapeClass}
      style={tentative ? { borderColor: color.solid } : { background: color.solid }}
      aria-hidden="true"
    />
  );
}

// At most this many markers per day in the compact grid; the rest are "+N".
const MAX_MARKERS = 3;

// The year is only added when it isn't this year.
const withYear = (date: Date): Intl.DateTimeFormatOptions =>
  date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" };

// Keys are local YYYY-MM-DD, so they also sort as dates.
function keyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function CalendarView({
  inquiries,
  onOpenCard,
}: {
  inquiries: BoardInquiry[];
  onOpenCard: (inquiry: BoardInquiry) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  // The compact layout's selected day: today on load and whenever the
  // current month comes back into view, nothing in any other month until
  // she taps a day. The full grid doesn't use it.
  const [selectedKey, setSelectedKey] = useState<string | null>(() => dateKey(new Date()));
  const compact = useCompactLayout();
  const dayPanelRef = useRef<HTMLElement>(null);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const eventsByDate = useMemo(() => buildEventsByDate(inquiries), [inquiries]);
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const changeMonth = (next: Date) => {
    setViewMonth(next);
    const isCurrentMonth = next.getTime() === startOfMonth(new Date()).getTime();
    setSelectedKey(isCurrentMonth ? dateKey(new Date()) : null);
  };
  const goToPreviousMonth = () => changeMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const goToNextMonth = () => changeMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToToday = () => changeMonth(startOfMonth(new Date()));

  // Tapping the selected day again keeps it selected. The day's list is
  // part of the page (no scroll box of its own), so a tap that leaves it
  // below the fold brings it into view — on a landscape phone it always is.
  const selectDay = (key: string) => {
    setSelectedKey(key);
    dayPanelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  // From an empty day's "Next:" line, which can point into a later month.
  const jumpToDay = (key: string) => {
    const month = startOfMonth(keyToDate(key));
    if (month.getTime() !== viewMonth.getTime()) setViewMonth(month);
    selectDay(key);
  };

  const selectedEvents = selectedKey ? (eventsByDate.get(selectedKey) ?? []) : [];
  // For an empty day: the first later date that has anything on it.
  const nextKey =
    selectedKey && selectedEvents.length === 0
      ? [...eventsByDate.keys()].filter((key) => key > selectedKey).sort()[0]
      : undefined;
  const nextEvent = nextKey ? eventsByDate.get(nextKey)?.[0] : undefined;

  const dayClass = (day: CalendarDay) =>
    `${styles.calendarDay}${day.inCurrentMonth ? "" : ` ${styles.calendarDayOutside}`}${
      day.isToday ? ` ${styles.calendarDayToday}` : ""
    }`;

  return (
    <div className={`${styles.calendar}${compact ? ` ${styles.calendarCompact}` : ""}`}>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarHeaderLeft}>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className={styles.calendarMonthLabel}>{monthLabel}</h2>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            ›
          </button>
          <button type="button" className={styles.calendarTodayButton} onClick={goToToday}>
            Today
          </button>
        </div>

        <div className={styles.calendarLegend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} />
            Confirmed shoot
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendRing} />
            Tentative shoot
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDiamond} />
            Deadline
          </span>
        </div>
      </div>

      <div className={styles.calendarWeekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.calendarWeekdayLabel}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {days.map((day) => {
          const dayEvents = eventsByDate.get(day.key) ?? [];

          if (compact) {
            const extra = dayEvents.length - MAX_MARKERS;
            const dayLabel = day.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
            const count =
              dayEvents.length === 0
                ? "nothing scheduled"
                : `${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`;
            return (
              <button
                key={day.key}
                type="button"
                className={`${dayClass(day)} ${styles.calendarDayButton}${
                  selectedKey === day.key ? ` ${styles.calendarDaySelected}` : ""
                }`}
                aria-pressed={selectedKey === day.key}
                aria-label={`${dayLabel}: ${count}`}
                onClick={() => selectDay(day.key)}
              >
                <span className={styles.calendarDayNumber}>{day.date.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span className={styles.calendarMarkers}>
                    {dayEvents.slice(0, MAX_MARKERS).map((event, index) => (
                      <EventMarker key={`${event.inquiry.id}-${event.kind}-${index}`} event={event} />
                    ))}
                    {extra > 0 && <span className={styles.calendarMarkerMore}>+{extra}</span>}
                  </span>
                )}
              </button>
            );
          }

          return (
            <div key={day.key} className={dayClass(day)}>
              <span className={styles.calendarDayNumber}>{day.date.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className={styles.calendarEvents}>
                  {dayEvents.map((event, index) => {
                    const color = getCategoryColor(event.inquiry.category.id);
                    const title = isTentative(event) ? `${event.title} (tentative)` : event.title;
                    return (
                      <button
                        key={`${event.inquiry.id}-${event.kind}-${index}`}
                        type="button"
                        className={styles.calendarEventChip}
                        style={{ background: color.tint, color: color.solid }}
                        title={title}
                        aria-label={title}
                        onClick={() => onOpenCard(event.inquiry)}
                      >
                        <EventMarker event={event} />
                        <span className={styles.calendarEventLabel}>
                          {event.name}
                          <span className={styles.calendarEventCategory}> · {event.inquiry.category.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {compact && (
        <section className={styles.calendarDayPanel} ref={dayPanelRef} aria-live="polite">
          {selectedKey === null ? (
            <p className={styles.calendarDayPanelEmpty}>Tap a day to see what&apos;s scheduled.</p>
          ) : (
            <>
              <h3 className={styles.calendarDayPanelHeading}>
                {keyToDate(selectedKey).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  ...withYear(keyToDate(selectedKey)),
                })}
              </h3>
              {selectedEvents.length > 0 ? (
                <ul className={styles.calendarDayPanelList}>
                  {selectedEvents.map((event, index) => (
                    <li key={`${event.inquiry.id}-${event.kind}-${index}`}>
                      <button
                        type="button"
                        className={styles.calendarDayPanelRow}
                        onClick={() => onOpenCard(event.inquiry)}
                      >
                        <EventMarker event={event} />
                        <span className={styles.calendarDayPanelText}>
                          <span className={styles.calendarDayPanelName}>{event.name}</span>
                          <span className={styles.calendarDayPanelMeta}>
                            {kindLabel(event)} · {event.inquiry.category.name}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className={styles.calendarDayPanelEmpty}>Nothing scheduled</p>
                  {nextKey && nextEvent && (
                    <button type="button" className={styles.calendarDayPanelNext} onClick={() => jumpToDay(nextKey)}>
                      Next:{" "}
                      {keyToDate(nextKey).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        ...withYear(keyToDate(nextKey)),
                      })}{" "}
                      · {nextEvent.name} · {kindLabel(nextEvent)}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
