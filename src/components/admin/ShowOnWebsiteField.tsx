"use client";

import type { CheckboxFieldClientComponent } from "payload";
import { FieldDescription, useDocumentInfo, useField, useFormFields } from "@payloadcms/ui";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";

// The `published` field of the Categories and Albums editors as an on/off
// switch labelled "Show on website", with the same Live / Hidden pill the
// lists use (CategoryCells.tsx, styled by .category-status in
// admin-overrides.css), so
// the two read as one control. A plain useField on the same path the
// default checkbox would use, so Save, Undo/Redo/Discard (EditHistory.tsx)
// and History treat it exactly like the checkbox it replaces.
//
// It sits in the main column directly under the name/title rather than Payload's
// sidebar: the sidebar moves below the form whenever Live Preview is open,
// so a sidebar field jumps around with the preview toggle.
//
// The "Other" category is the CRM's catch-all and the server refuses to
// publish it (Categories.ts), so its switch is locked off with the reason
// shown. Checked against the collection too, since an album titled "Other"
// gets the same slug.
const ShowOnWebsiteField: CheckboxFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue } = useField<boolean>({ path });
  const { collectionSlug } = useDocumentInfo();
  const slug = useFormFields(([fields]) => fields.slug?.value);
  const isOther = collectionSlug === "categories" && slug === OTHER_SESSION_TYPE;
  const on = value === true;
  const disabled = readOnly || isOther;
  const id = `field-${path.replace(/\./g, "__")}`;
  const label = typeof field.label === "string" ? field.label : "Show on website";
  // Testimonials say "Published" where categories and albums say "Live".
  const onLabel = (field.admin?.custom?.onLabel as string | undefined) ?? "Live";
  const description = isOther
    ? "Used by your CRM, so it's never shown on the site."
    : field.admin?.description;

  return (
    <div className="field-type show-on-website">
      <div className="show-on-website__row">
        <button
          type="button"
          role="switch"
          id={id}
          aria-checked={on}
          disabled={disabled}
          onClick={() => setValue(!on)}
          className={`show-on-website__switch${on ? " show-on-website__switch--on" : ""}`}
        >
          <span className="show-on-website__knob" />
        </button>
        <label htmlFor={id} className="show-on-website__label">
          {label}
        </label>
        {isOther ? (
          <span className="category-status category-status--crm">CRM only</span>
        ) : (
          <span className={`category-status category-status--${on ? "live" : "hidden"}`}>
            {on ? onLabel : "Hidden"}
          </span>
        )}
      </div>
      {description && <FieldDescription description={description} path={path} />}
    </div>
  );
};

export default ShowOnWebsiteField;
