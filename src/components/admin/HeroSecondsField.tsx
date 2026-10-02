"use client";

import type { NumberFieldClientComponent } from "payload";
import { FieldDescription, FieldError, FieldLabel, useField } from "@payloadcms/ui";
import {
  SECONDS_PER_PHOTO_MAX,
  SECONDS_PER_PHOTO_MIN,
  SECONDS_PER_PHOTO_STEP,
  secondsPerPhoto,
} from "@/lib/hero-limits";

// The Hero's "Seconds per photo" (globals/Hero.ts) as a slider in half
// seconds, with the value shown beside it. A plain useField on the number,
// so Save, Undo/Redo (EditHistory) and Live Preview treat it like the
// number field it replaces.

const format = (seconds: number) => `${seconds} ${seconds === 1 ? "second" : "seconds"}`;

const HeroSecondsField: NumberFieldClientComponent = ({ field, path: pathFromProps, readOnly }) => {
  const { path, value, setValue, showError, disabled } = useField<number>({ potentiallyStalePath: pathFromProps });
  const seconds = secondsPerPhoto(value);
  const id = `field-${path.replace(/\./g, "__")}`;
  const label = typeof field.label === "string" ? field.label : "Seconds per photo";

  return (
    <div className={`field-type hero-seconds${showError ? " error" : ""}`}>
      <FieldLabel htmlFor={id} label={label} path={path} required={field.required} />
      <FieldError path={path} showError={showError} />
      <div className="hero-seconds__row">
        <div className="hero-seconds__track">
          <input
            id={id}
            type="range"
            className="hero-seconds__slider"
            min={SECONDS_PER_PHOTO_MIN}
            max={SECONDS_PER_PHOTO_MAX}
            step={SECONDS_PER_PHOTO_STEP}
            value={seconds}
            disabled={readOnly || disabled}
            aria-valuetext={format(seconds)}
            onChange={(event) => setValue(Number(event.target.value))}
          />
          <div className="hero-seconds__scale" aria-hidden="true">
            <span>{SECONDS_PER_PHOTO_MIN}s</span>
            <span>{SECONDS_PER_PHOTO_MAX}s</span>
          </div>
        </div>
        <output htmlFor={id} className="hero-seconds__value" aria-live="polite">
          {format(seconds)}
        </output>
      </div>
      {field.admin?.description && <FieldDescription description={field.admin.description} path={path} />}
    </div>
  );
};

export default HeroSecondsField;
