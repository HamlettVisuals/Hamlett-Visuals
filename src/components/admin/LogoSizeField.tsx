"use client";

import type { NumberFieldClientProps } from "payload";
import { FieldDescription, useField } from "@payloadcms/ui";

// Site Settings' `logoHeight` and `footerLogoHeight` as a range slider with
// the current size shown next to it, instead of Payload's plain number box.
// A plain useField on the same path, so Save, Undo/Redo/Discard
// (EditHistory.tsx) and History treat it like the number field it replaces.
// Min/max come from the field config and `defaultHeight` (shown while the
// value is empty) from its clientProps — see SiteSettings.ts and
// lib/logo-size.ts. Wordmark.tsx reads the values.
type LogoSizeFieldProps = NumberFieldClientProps & { defaultHeight?: number };

const LogoSizeField = ({ field, path, readOnly, defaultHeight }: LogoSizeFieldProps) => {
  const { value, setValue } = useField<number>({ path });
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const current = typeof value === "number" ? value : (defaultHeight ?? min);
  const id = `field-${path.replace(/\./g, "__")}`;
  const label = typeof field.label === "string" ? field.label : field.name;

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
