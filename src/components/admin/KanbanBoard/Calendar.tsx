"use client";

import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
// (landscape phones): markers in the grid, full details in an agenda below.
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
// compact grid's markers and the agenda rows alike. Three distinct shapes,
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

export default function CalendarView({
  inquiries,
  onOpenCard,
}: {
  inquiries: BoardInquiry[];
  onOpenCard: (inquiry: BoardInquiry) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const compact = useCompactLayout();
  const agendaRef = useRef<HTMLElement>(null);
  const agendaScrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const eventsByDate = useMemo(() => buildEventsByDate(inquiries), [inquiries]);
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = dateKey(new Date());
  // The agenda covers every day the grid shows (so a marker on a leading or
  // trailing day from the next month still has a row to jump to).
  const agendaDays = days.filter((day) => eventsByDate.has(day.key));

  const changeMonth = (next: Date) => {
    setViewMonth(next);
    setSelectedKey(null);
  };
  const goToPreviousMonth = () => changeMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const goToNextMonth = () => changeMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToToday = () => changeMonth(startOfMonth(new Date()));

  const scrollAgendaTo = (key: string, behavior: ScrollBehavior) => {
    const box = agendaScrollRef.current;
    const group = box?.querySelector<HTMLElement>(`[data-day="${key}"]`);
    if (box && group) box.scrollTo({ top: group.offsetTop, behavior });
  };

  // Opening the compact view (or changing month): the agenda starts at today
  // — or the next upcoming date — when the current month is showing, and at
  // the top otherwise. Only the agenda's own list scrolls; the page stays at
  // the grid.
  const monthStamp = viewMonth.getTime();
  useLayoutEffect(() => {
    const box = agendaScrollRef.current;
    if (!compact || !box) return;
    const isCurrentMonth = startOfMonth(new Date()).getTime() === monthStamp;
    const upcoming = isCurrentMonth
      ? [...box.querySelectorAll<HTMLElement>("[data-day]")].find((group) => (group.dataset.day ?? "") >= todayKey)
      : undefined;
    box.scrollTop = upcoming ? upcoming.offsetTop : 0;
    // Deliberately not re-run when events change (a card moved in the
    // drawer) — that shouldn't yank the list away from where she is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, monthStamp]);

  const selectDay = (key: string) => {
    setSelectedKey(key);
    agendaRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    scrollAgendaTo(key, "smooth");
  };

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
            if (dayEvents.length === 0) {
              return (
                <div key={day.key} className={dayClass(day)}>
                  <span className={styles.calendarDayNumber}>{day.date.getDate()}</span>
                </div>
              );
            }
            const extra = dayEvents.length - MAX_MARKERS;
            const dayLabel = day.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
            return (
              <button
                key={day.key}
                type="button"
                className={`${dayClass(day)} ${styles.calendarDayButton}${
                  selectedKey === day.key ? ` ${styles.calendarDaySelected}` : ""
                }`}
                aria-pressed={selectedKey === day.key}
                aria-label={`${dayLabel}: ${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`}
                onClick={() => selectDay(day.key)}
              >
                <span className={styles.calendarDayNumber}>{day.date.getDate()}</span>
                <span className={styles.calendarMarkers}>
                  {dayEvents.slice(0, extra > 0 ? MAX_MARKERS - 1 : MAX_MARKERS).map((event, index) => (
                    <EventMarker key={`${event.inquiry.id}-${event.kind}-${index}`} event={event} />
                  ))}
                  {extra > 0 && <span className={styles.calendarMarkerMore}>+{extra + 1}</span>}
                </span>
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
        <section className={styles.calendarAgenda} ref={agendaRef} aria-label={`Events, ${monthLabel}`}>
          <div className={styles.calendarAgendaScroll} ref={agendaScrollRef}>
            {agendaDays.length === 0 ? (
              <p className={styles.calendarAgendaEmpty}>No shoots or deadlines in {monthLabel}.</p>
            ) : (
              agendaDays.map((day) => {
                const past = day.key < todayKey;
                return (
                  <div
                    key={day.key}
                    data-day={day.key}
                    className={`${styles.calendarAgendaDay}${past ? ` ${styles.calendarAgendaDayPast}` : ""}${
                      selectedKey === day.key ? ` ${styles.calendarAgendaDaySelected}` : ""
                    }`}
                  >
                    <h3 className={styles.calendarAgendaDate}>
                      {day.isToday && "Today · "}
                      {day.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </h3>
                    <ul className={styles.calendarAgendaList}>
                      {(eventsByDate.get(day.key) ?? []).map((event, index) => (
                        <li key={`${event.inquiry.id}-${event.kind}-${index}`}>
                          <button
                            type="button"
                            className={styles.calendarAgendaRow}
                            onClick={() => onOpenCard(event.inquiry)}
                          >
                            <EventMarker event={event} />
                            <span className={styles.calendarAgendaText}>
                              <span className={styles.calendarAgendaName}>{event.name}</span>
                              <span className={styles.calendarAgendaMeta}>
                                {kindLabel(event)} · {event.inquiry.category.name}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
