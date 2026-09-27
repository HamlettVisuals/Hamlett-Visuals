"use client";

import type { NumberFieldClientComponent } from "payload";
import { FieldDescription, useField } from "@payloadcms/ui";
import { DEFAULT_LOGO_HEIGHT } from "@/components/Wordmark";

// Site Settings' `logoHeight` as a range slider with the current size shown
// next to it, instead of Payload's plain number box. A plain useField on the
// same path, so Save, Undo/Redo/Discard (EditHistory.tsx) and History treat
// it like the number field it replaces. Min/max come from the field config
// (SiteSettings.ts); the header reads the value in Wordmark.tsx, which also
// owns the default used while the value is empty.
const FALLBACK = { min: 28, max: 56 };

const LogoSizeField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue } = useField<number>({ path });
  const min = field.min ?? FALLBACK.min;
  const max = field.max ?? FALLBACK.max;
  const current = typeof value === "number" ? value : DEFAULT_LOGO_HEIGHT;
  const id = `field-${path.replace(/\./g, "__")}`;
  const label = typeof field.label === "string" ? field.label : "Logo size";

  return (
    <div className="field-type logo-size">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="logo-size__row">
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={1}
          value={current}
          disabled={readOnly}
          onChange={(event) => setValue(Number(event.target.value))}
          className="logo-size__slider"
        />
        <output htmlFor={id} className="logo-size__value">
          {current}px
        </output>
      </div>
      {field.admin?.description && (
        <FieldDescription description={field.admin.description} path={path} />
      )}
    </div>
  );
};

export default LogoSizeField;
