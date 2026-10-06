// The Booking page's editable words, as they read before they were editable:
// the Booking Page global's defaults (globals/Booking.ts), and what the page
// shows if a saved value is ever blank. Part of payload.config.ts's module
// graph, so no "@/…" imports.

export const BOOKING_HOW_IT_WORKS = "How it works";
export const BOOKING_SUBMIT_LABEL = "Send your request";
export const BOOKING_DATE_HELP =
  "Just a starting point — she’ll confirm actual availability when she follows up.";
/** {name} is the client's first name. */
export const BOOKING_CONFIRMATION_HEADING = "Thanks, {name}.";
export const BOOKING_CONFIRMATION_MESSAGE =
  "Your request has been sent. She reads every one herself and usually replies within a day or two.";

/** The first name as typed, with only its first letter capitalized ("jane" → "Jane", "mcKay" → "McKay"). */
export const capitalizeFirst = (name: string) => (name ? name.charAt(0).toLocaleUpperCase() + name.slice(1) : name);

/** The thank-you heading with {name} filled in ("there" with no name). */
export const confirmationHeading = (template: string | null | undefined, firstName: string) =>
  (template?.trim() || BOOKING_CONFIRMATION_HEADING).replaceAll("{name}", capitalizeFirst(firstName.trim()) || "there");
