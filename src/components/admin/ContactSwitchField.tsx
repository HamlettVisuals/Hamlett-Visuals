"use client";

import { useEffect, useState } from "react";
import type { CheckboxFieldClientComponent } from "payload";
import { FieldDescription, useConfig, useField } from "@payloadcms/ui";
import { contactDetails, type ContactDetails } from "@/lib/contact-details";

// The "Show email / phone number / Instagram" checkboxes of the
// Booking CTA (globals/BookingCta.ts) and the footer
// (globals/FinalCtaFooter.ts) as on/off switches — same look as "Show on
// website" (ShowOnWebsiteField.tsx, .show-on-website in admin-overrides.css)
// — each with what Site Settings currently has for that detail, or a note
// that it's empty there and so won't show whichever way the switch is set.
// A plain useField on the checkbox's own path, so Save, Undo/Redo/Discard
// (EditHistory.tsx) and History treat it like the checkbox it replaces.

type Kind = "email" | "phone" | "instagram";

const MISSING: Record<Kind, string> = {
  email: "No email in Site Settings yet, so it won't show.",
  phone: "No phone number in Site Settings yet, so it won't show.",
  instagram: "No Instagram username in Site Settings yet, so it won't show.",
};

// One fetch for all three switches on the page.
let settingsRequest: Promise<ContactDetails | null> | null = null;

function useSiteContactDetails(): ContactDetails | null | undefined {
  const { config } = useConfig();
  const [details, setDetails] = useState<ContactDetails | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    settingsRequest ??= fetch(
      `${config.serverURL ?? ""}${config.routes.api}/globals/site-settings?depth=0`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((doc) => (doc ? contactDetails(doc) : null))
      .catch(() => null)
      .finally(() => {
        // Fetched fresh the next time the editor is opened.
        setTimeout(() => (settingsRequest = null), 0);
      });
    settingsRequest.then((result) => {
      if (!cancelled) setDetails(result);
    });
    return () => {
      cancelled = true;
    };
  }, [config.routes.api, config.serverURL]);
  return details;
}

const ContactSwitchField: CheckboxFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue } = useField<boolean>({ path });
  const details = useSiteContactDetails();
  const kind = (field.admin?.custom as { contact?: Kind } | undefined)?.contact ?? "email";
  const on = value !== false;
  const id = `field-${path.replace(/\./g, "__")}`;
  const label = typeof field.label === "string" ? field.label : path;

  let current: string | null = null;
  if (details) {
    current =
      kind === "email"
        ? details.email
        : kind === "phone"
          ? (details.phone?.display ?? null)
          : (details.instagram?.handle ?? null);
  }

  return (
    <div className="field-type show-on-website contact-switch">
      <div className="show-on-website__row">
        <button
          type="button"
          role="switch"
          id={id}
          aria-checked={on}
          disabled={readOnly}
          onClick={() => setValue(!on)}
          className={`show-on-website__switch${on ? " show-on-website__switch--on" : ""}`}
        >
          <span className="show-on-website__knob" />
        </button>
        <label htmlFor={id} className="show-on-website__label">
          {label}
        </label>
        {current && <span className="contact-switch__value">{current}</span>}
      </div>
      {details && !current && <p className="contact-switch__missing">{MISSING[kind]}</p>}
      {field.admin?.description && <FieldDescription description={field.admin.description} path={path} />}
    </div>
  );
};

export default ContactSwitchField;
