"use client";

import { useEffect, useState } from "react";

// Tracks prefers-reduced-motion live (not just at mount) — shared by
// BookingFlow's progress-tracker stagger and BookingForm's form-to-success
// crossfade (src/components/booking/), which both need to fully skip their
// JS-driven animation sequencing, not just shorten CSS transitions, when the
// preference is set.
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}
