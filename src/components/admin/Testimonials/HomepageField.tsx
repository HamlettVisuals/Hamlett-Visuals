"use client";

import { useEffect, useState } from "react";
import type { CheckboxFieldClientComponent } from "payload";
import { FieldDescription, useConfig, useDocumentInfo, useField, useFormFields } from "@payloadcms/ui";
import { TESTIMONIAL_PICKS_MAX } from "@/lib/teaser-testimonials";
import { idOf } from "./api";

// "Show on homepage": whether this testimonial is one of the homepage
// Testimonials Section's picks. Not stored on the testimonial; read and
// applied on Save by Testimonials.ts (lib/testimonial-homepage.ts). A
// switch like Published above it. Off and locked while Published is off
// or before the first save; when the homepage already has the most it can
// show, turning it on says so instead.
const HomepageField: CheckboxFieldClientComponent = ({ field, path, readOnly }) => {
  const { config } = useConfig();
  const { id } = useDocumentInfo();
  const { value, setValue } = useField<boolean>({ path });
  const published = useFormFields(([fields]) => fields.published?.value) !== false;
  const [picks, setPicks] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    void fetch(`${apiBase}/globals/testimonials-teaser?depth=0`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((global: { testimonials?: unknown[] } | null) =>
        setPicks((global?.testimonials ?? []).map(idOf).filter((pick): pick is number => pick != null)),
      )
      .catch(() => setPicks([]));
  }, [apiBase]);

  // Hiding it takes it off the homepage (on Save).
  useEffect(() => {
    if (!published && value) setValue(false);
  }, [published, value, setValue]);

  const on = value === true;
  const disabled = Boolean(readOnly) || !id || !published;
  const others = picks.filter((pick) => pick !== Number(id)).length;
  const toggle = () => {
    setMessage(null);
    if (!on && others >= TESTIMONIAL_PICKS_MAX) {
      setMessage(
        `The homepage already shows ${TESTIMONIAL_PICKS_MAX} testimonials. Remove one from the homepage first, in the Testimonials list or the Testimonials Section.`,
      );
      return;
    }
    setValue(!on);
  };
  const inputId = `field-${path.replace(/\./g, "__")}`;
  const description = !id
    ? "Save this testimonial first, then you can show it on the homepage."
    : !published
      ? "Turn on Published to show it on the homepage."
      : `Shows it in your homepage's Testimonials Section (up to ${TESTIMONIAL_PICKS_MAX}), added at the end. Changes when you save.`;

  return (
    <div className="field-type show-on-website">
      <div className="show-on-website__row">
        <button
          type="button"
          role="switch"
          id={inputId}
          aria-checked={on}
          disabled={disabled}
          onClick={toggle}
          className={`show-on-website__switch${on ? " show-on-website__switch--on" : ""}`}
        >
          <span className="show-on-website__knob" />
        </button>
        <label htmlFor={inputId} className="show-on-website__label">
          {typeof field.label === "string" ? field.label : "Show on homepage"}
        </label>
      </div>
      {message && (
        <div className="field-warning" role="alert">
          {message}
        </div>
      )}
      <FieldDescription description={description} path={path} />
    </div>
  );
};

export default HomepageField;
