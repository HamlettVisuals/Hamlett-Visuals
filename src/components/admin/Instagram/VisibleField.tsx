"use client";

import type { CheckboxFieldClientComponent } from "payload";
import { FieldDescription, useField, useFormFields } from "@payloadcms/ui";
import { rowPathOf, useInstagramStatus } from "./store";

// An Instagram account's "Show on homepage" switch, the same switch and
// Live / Hidden pill as "Show on website" (ShowOnWebsiteField.tsx). Locked
// until the account is connected, and the homepage ignores it until then;
// it keeps her choice, so connecting the account later shows it (or not)
// as she left it (globals/InstagramSection.ts).
const VisibleField: CheckboxFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue } = useField<boolean>({ path });
  const slot = useFormFields(([fields]) => Number(fields[`${rowPathOf(path)}.slot`]?.value) || 0);
  const { status } = useInstagramStatus();
  const connected = status?.accounts.find((a) => a.slot === slot)?.status === "connected";
  const on = value === true;
  const id = `field-${path.replace(/\./g, "__")}`;
  const label = typeof field.label === "string" ? field.label : "Show on homepage";

  return (
    <div className="field-type show-on-website ig-visible">
      <div className="show-on-website__row">
        <button
          type="button"
          role="switch"
          id={id}
          aria-checked={on}
          disabled={readOnly || !connected}
          onClick={() => setValue(!on)}
          className={`show-on-website__switch${on ? " show-on-website__switch--on" : ""}`}
        >
          <span className="show-on-website__knob" />
        </button>
        <label htmlFor={id} className="show-on-website__label">
          {label}
        </label>
        <span className={`category-status category-status--${connected && on ? "live" : "hidden"}`}>
          {!connected ? "Not connected" : on ? "Live" : "Hidden"}
        </span>
      </div>
      <FieldDescription
        description={connected ? "Turn off to leave this account's posts off your homepage." : on ? "Shown once this account is connected." : "Connect this account first."}
        path={path}
      />
    </div>
  );
};

export default VisibleField;
