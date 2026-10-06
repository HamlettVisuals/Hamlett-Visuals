import { preferredTimeLabel } from "@/lib/booking-time";

// Payload's date-only fields (shootDate, preferredDate, deliveryDeadline)
// round-trip as a full ISO datetime at UTC midnight for
// whatever calendar day was picked — e.g. picking "Oct 15" produces
// "2026-10-15T00:00:00.000Z" regardless of the browser's own timezone. Doing
// `new Date(value).toLocaleDateString()` on that string reads it back with
// *local* getters, which in any timezone behind UTC lands on the previous
// day (6pm Oct 14 local, for UTC-6). Reconstructing a new Date from the
// string's *UTC* calendar components instead gives a Date that's local
// midnight on the actually-intended day, so every local-getter-based read
// after this point — .toLocaleDateString(), the calendar's own day-bucketing
// in Calendar.tsx — lines up with the day that was actually entered, on any
// server or viewer timezone.
export function parseCalendarDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

export function formatShortDate(value: string | null | undefined): string | null {
  const date = parseCalendarDate(value);
  return date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
}

export function formatFullDate(value: string | null | undefined): string | null {
  const date = parseCalendarDate(value);
  return date
    ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;
}

// For real timestamps (createdAt, updatedAt) — NOT the date-only fields
// parseCalendarDate above exists for. There's no encoding bug to work around
// here: Payload stores the actual instant, so plain local-timezone getters
// (what .toLocaleDateString() already uses) are exactly the right read —
// "what day was it, for me, when this came in."
export function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export type StageDateSource = {
  stage: string;
  createdAt?: string | null;
  preferredDate?: string | null;
  /** Shown after a Planning card's preferred date ("Preferred Oct 15 · Afternoon"). */
  preferredTime?: string | null;
  shootDate?: string | null;
  deliveryDeadline?: string | null;
};

// The single field each stage's date is drawn from — shared by
// stageDateLabel (the card's date text) and stageDateSortValue (each
// column's sort order), so the two can never drift apart on which field is
// "the" date for a given stage.
function stageDateField(inquiry: StageDateSource): string | null | undefined {
  switch (inquiry.stage) {
    case "lead":
      return inquiry.createdAt;
    case "planning":
      return inquiry.preferredDate;
    case "prep":
      return inquiry.shootDate;
    case "shoot":
    case "post":
      return inquiry.deliveryDeadline;
    default:
      return null;
  }
}

// The one date a kanban card shows depends on what stage it's in — the
// field that's actually relevant to her changes as a job moves through the
// pipeline (when it came in, when they want it, when it's shot, when it's
// due). No date is shown at all, rather than a placeholder, when that
// stage's field isn't set — see Card.tsx.
export function stageDateLabel(inquiry: StageDateSource): string | null {
  const value = stageDateField(inquiry);
  switch (inquiry.stage) {
    case "lead": {
      const date = formatTimestamp(value);
      return date ? `Received ${date}` : null;
    }
    case "planning": {
      const date = formatShortDate(value);
      const time = preferredTimeLabel(inquiry.preferredTime);
      return date ? `Preferred ${date}${time ? ` · ${time}` : ""}` : null;
    }
    case "prep": {
      const date = formatShortDate(value);
      return date ? `Shoot ${date}` : null;
    }
    case "shoot":
    case "post": {
      const date = formatShortDate(value);
      return date ? `Delivery ${date}` : null;
    }
    default:
      return null;
  }
}

// A column's cards sort oldest/soonest-first by this same stage-relevant
// date — a stale Lead should bubble toward the top instead of getting
// buried under newer ones, and an upcoming Shoot/Delivery date sooner in
// time is the more urgent one to see first. Cards missing that stage's date
// entirely (rare, but possible) sort to the very end rather than the start,
// via +Infinity — see Board.tsx.
export function stageDateSortValue(inquiry: StageDateSource): number {
  const value = stageDateField(inquiry);
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

// Column order, shared by Board.tsx and MobileList.tsx: stage date first
// (see stageDateSortValue above), then — for ties, which includes every
// undated card and the whole Wrap-Up column (no stage date at all) — when
// the inquiry came in, oldest first, then id. Explicit rather than leaning
// on sort stability: the server fetch is ordered by last-updated, so a tie
// used to fall back to that and any edit (even a trash + restore) could
// reshuffle undated cards. Equality is checked before subtracting because
// two undated cards are Infinity - Infinity = NaN, not 0.
export function compareByStageDate(
  a: StageDateSource & { id: number },
  b: StageDateSource & { id: number },
): number {
  const aStage = stageDateSortValue(a);
  const bStage = stageDateSortValue(b);
  if (aStage !== bStage) return aStage - bStage;

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : Number.POSITIVE_INFINITY;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : Number.POSITIVE_INFINITY;
  if (aCreated !== bCreated) return aCreated - bCreated;

  return a.id - b.id;
}

// Populates a plain <input type="date">'s value from a stored date-only
// field. Deliberately a raw string slice, not a Date round-trip through
// parseCalendarDate: Payload always stores these as "YYYY-MM-DDT00:00:00.000Z"
// (UTC midnight for the picked day — see parseCalendarDate's own comment),
// so the first 10 characters already *are* the date input's expected
// "YYYY-MM-DD" — no timezone-sensitive conversion to get wrong here at all.
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export const TYPE_LABELS: Record<string, string> = {
  question: "Question",
  booking: "Booking",
};

export const POST_PRODUCTION_LABELS: Record<string, string> = {
  editing: "Editing",
  edited: "Edited",
  sent: "Sent",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  deposit: "Deposit paid",
  paid: "Paid in full",
};

export const SOURCE_LABELS: Record<string, string> = {
  website: "Website form",
  manual_social: "Manual — social",
  manual_email: "Manual — email",
  manual_referral: "Manual — referral",
};
