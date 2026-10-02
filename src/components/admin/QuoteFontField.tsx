"use client";

import type { TextFieldClientComponent } from "payload";
import { FieldDescription, FieldError, FieldLabel, SelectInput, useField } from "@payloadcms/ui";
import { QUOTE_FONT_OPTIONS, isQuoteFontKey } from "@/lib/quote-font-options";

// The quote-font dropdown (Testimonials Page and Testimonials Section): the
// registry's names (lib/quote-font-options.ts) over a plain text field. A
// saved font that's since left the registry says so; the site uses the
// default until another is picked (resolveQuoteFont).
const QuoteFontField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError } = useField<string>({ path });
  const known = isQuoteFontKey(value);
  const options = QUOTE_FONT_OPTIONS.map((option) => ({ label: option.label, value: option.key }));

  return (
    <div className="field-type select">
      <FieldLabel label={field.label ?? "Quote font"} path={path} />
      <FieldError path={path} showError={showError} />
      <SelectInput
        name={path}
        path={path}
        options={options}
        value={known ? value : undefined}
        onChange={(option) => {
          const next = Array.isArray(option) ? option[0]?.value : option?.value;
          if (typeof next === "string") setValue(next);
        }}
        readOnly={readOnly}
        isClearable={false}
        showError={showError}
      />
      {value && !known && (
        <div className="field-warning" role="status">
          The saved font isn&apos;t available any more, so the default is used. Pick one to change it.
        </div>
      )}
      {field.admin?.description && <FieldDescription description={field.admin.description} path={path} />}
    </div>
  );
};

export default QuoteFontField;
