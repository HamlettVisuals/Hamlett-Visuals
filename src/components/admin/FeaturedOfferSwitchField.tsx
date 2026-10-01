"use client";

import { useEffect, useRef } from "react";
import type { CheckboxFieldClientComponent } from "payload";
import { useField } from "@payloadcms/ui";
import ShowOnWebsiteField from "@/components/admin/ShowOnWebsiteField";

// The Featured Offer global's "Show on homepage" switch: the same on/off
// switch and Live / Hidden pill as "Show on website" (ShowOnWebsiteField),
// and while it's off the fields below it (package, heading, badge) are
// greyed out and can't be changed. They keep their values, so turning the
// switch back on brings the spotlight back as it was.
//
// Greyed out with `inert` (no clicks, no keyboard focus, skipped by screen
// readers) and the .featured-offer-off style in admin-overrides.css.
const FOLLOWING = ["featuredPackage", "heading", "badgeLabel"];

const FeaturedOfferSwitchField: CheckboxFieldClientComponent = (props) => {
  const { value } = useField<boolean>({ path: props.path });
  const off = value === false;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    // `#field-<name>` is the input itself on text fields; grey out the
    // whole field (label, input, description, warning).
    const fields = FOLLOWING.map((name) =>
      form.querySelector<HTMLElement>(`#field-${name}`)?.closest<HTMLElement>(".featured-package-field, .field-type"),
    ).filter(
      (el): el is HTMLElement => el != null,
    );
    for (const el of fields) {
      el.inert = off;
      el.classList.toggle("featured-offer-off", off);
    }
  });

  return (
    <div ref={ref} className="featured-offer-switch">
      <ShowOnWebsiteField {...props} />
    </div>
  );
};

export default FeaturedOfferSwitchField;
