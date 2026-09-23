"use client";

import { useMemo, useState } from "react";
import { getCategoryColor } from "@/lib/category-colors";
import styles from "./KanbanBoard.module.css";
import { buildMonthGrid, dateKey, WEEKDAY_LABELS } from "./calendar-utils";
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

export default function CalendarView({
  inquiries,
  onOpenCard,
}: {
  inquiries: BoardInquiry[];
  onOpenCard: (inquiry: BoardInquiry) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const eventsByDate = useMemo(() => buildEventsByDate(inquiries), [inquiries]);
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const goToPreviousMonth = () =>
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToToday = () => setViewMonth(startOfMonth(new Date()));

  return (
    <div className={styles.calendar}>
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
          return (
            <div
              key={day.key}
              className={`${styles.calendarDay}${day.inCurrentMonth ? "" : ` ${styles.calendarDayOutside}`}${
                day.isToday ? ` ${styles.calendarDayToday}` : ""
              }`}
            >
              <span className={styles.calendarDayNumber}>{day.date.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className={styles.calendarEvents}>
                  {dayEvents.map((event, index) => {
                    const color = getCategoryColor(event.inquiry.category.id);
                    const isTentativeShoot = event.kind === "shoot" && !event.confirmed;
                    // Three distinct shapes, not just a hover-only distinction: a
                    // filled circle (confirmed shoot), an outline-only ring
                    // (tentative shoot — the ring's old deadline meaning moves to
                    // the diamond below), and a filled diamond (deadline).
                    const indicatorClass =
                      event.kind === "deadline"
                        ? styles.calendarEventDiamond
                        : isTentativeShoot
                          ? styles.calendarEventRing
                          : styles.calendarEventDot;
                    const indicatorStyle = isTentativeShoot
                      ? { borderColor: color.solid }
                      : { background: color.solid };
                    return (
                      <button
                        key={`${event.inquiry.id}-${event.kind}-${index}`}
                        type="button"
                        className={styles.calendarEventChip}
                        style={{ background: color.tint, color: color.solid }}
                        title={isTentativeShoot ? `${event.title} (tentative)` : event.title}
                        aria-label={isTentativeShoot ? `${event.title} (tentative)` : event.title}
                        onClick={() => onOpenCard(event.inquiry)}
                      >
                        <span className={indicatorClass} style={indicatorStyle} />
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
    </div>
  );
}
