"use client";

import { useEffect, useRef } from "react";
import { useFormFields } from "@payloadcms/ui";

// Live "12/24" counter for character-capped text fields in the website
// editor. The count turns amber at the cap, and the input's own maxLength
// is set so the browser stops typing (and trims pastes) at the limit.
//
// Nobody wires this up by hand: lib/character-counters.ts attaches it as
// the afterInput of every text/textarea field with a `maxLength`, so a new
// capped field gets it just by setting maxLength. The cap is still enforced
// on save by the field config. NavLinksField renders its own inputs, so it
// uses <CounterBadge> directly for the same look.

export function CounterBadge({ length, max }: { length: number; max: number }) {
  return (
    <span
      className={`char-counter${length >= max ? " char-counter--full" : ""}`}
      aria-hidden="true"
    >
      {length}/{max}
    </span>
  );
}

type Props = {
  path: string;
  field?: { maxLength?: number };
};

export default function CharacterCounter({ path, field }: Props) {
  const max = field?.maxLength;
  const value = useFormFields(([fields]) => fields[path]?.value);
  const ref = useRef<HTMLSpanElement>(null);

  // The input is a sibling inside Payload's .field-type__wrap; it re-renders
  // without a maxLength prop, so the attribute set here sticks.
  useEffect(() => {
    const input = ref.current?.parentElement?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >("input, textarea");
    if (input && max) input.maxLength = max;
  });

  // Pin the counter to the input's own box. The wrap also holds the field's
  // description, so it can't simply be centred in the wrap: vertically
  // centred on a text input, bottom-right corner of a textarea (which can
  // be resized, hence the observer).
  useEffect(() => {
    const anchor = ref.current;
    const input = anchor?.parentElement?.querySelector<HTMLElement>("input, textarea");
    if (!anchor || !input) return;
    const place = () => {
      const isTextarea = input.tagName === "TEXTAREA";
      const top = isTextarea
        ? input.offsetTop + input.offsetHeight - 8
        : input.offsetTop + input.offsetHeight / 2;
      anchor.style.setProperty("--char-counter-top", `${top}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(input);
    return () => observer.disconnect();
  }, [max]);

  if (!max) return null;
  const length = typeof value === "string" ? value.length : 0;
  return (
    <span ref={ref} className="char-counter__anchor">
      <CounterBadge length={length} max={max} />
    </span>
  );
}
