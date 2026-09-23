// Pure date/grid helpers for CalendarView — kept separate from the
// component so the month-grid math (and its Sunday-start, 6-week-grid
// choices) can be read on its own, the same way format.ts separates the
// board's formatting helpers from its JSX.

export type CalendarDay = {
  date: Date;
  /** Local YYYY-MM-DD — used to bucket events onto the grid. */
  key: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Local (not UTC) date parts, so a date typed in on this machine lands on
// the day it looks like it should — consistent between how the grid's own
// cells are keyed and how Inquiry date fields get bucketed onto them.
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// A fixed 6-week (42-day) grid, including the leading/trailing days from
// the adjacent months needed to fill out the first and last weeks — keeps
// every month the same height rather than reflowing the page as you
// navigate between 4-week and 6-week months.
export function buildMonthGrid(viewMonth: Date, today: Date = new Date()): CalendarDay[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const todayKey = dateKey(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const key = dateKey(date);
    return {
      date,
      key,
      inCurrentMonth: date.getMonth() === month,
      isToday: key === todayKey,
    };
  });
}
