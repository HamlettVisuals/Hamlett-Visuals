"use client";

import { useRowLabel } from "@payloadcms/ui";

// The Booking Page's "How it works" steps (globals/Booking.ts): each row's
// header says which step it is, "1 · Pick a date", like the hero slides'
// headers (HeroSlideRowLabel.tsx), instead of Payload's "Step 01". Follows
// the title as she types.
export default function StepRowLabel() {
  const { data, rowNumber } = useRowLabel<{ title?: string | null }>();
  const title = data?.title?.trim();
  return (
    <span className="step-row-label">
      {(rowNumber ?? 0) + 1} · {title || "New step"}
    </span>
  );
}
