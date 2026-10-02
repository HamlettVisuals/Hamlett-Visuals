"use client";

import { useFormFields } from "@payloadcms/ui";

// Under the Booking Section's contact switches (globals/BookingCta.ts): when
// all three are off but the contact line text isn't empty, the text shows on
// its own (lib/booking-contact-line.ts), so say so.

export default function ContactLineAloneNote() {
  const show = useFormFields(([fields]) => {
    const text = fields.contactLeadIn?.value;
    const allOff = (["showEmail", "showPhone", "showInstagram"] as const).every(
      (name) => fields[name]?.value === false,
    );
    return allOff && typeof text === "string" && text.trim() !== "";
  });
  if (!show) return null;
  return (
    <p className="field-type contact-line-alone-note">
      No contact details are shown, so this text will appear on its own.
    </p>
  );
}
