"use client";

import { Link, useConfig, useFormFields } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { idOf } from "./api";

// Top of the testimonial form: where it came from. A client's links to
// their submission, which keeps what never goes on the site (their email,
// social link, private notes and the photos they sent).
export default function SourceNote() {
  const { config } = useConfig();
  const source = useFormFields(([fields]) => fields.source?.value);
  const submission = idOf(useFormFields(([fields]) => fields.submission?.value));
  if (source !== "client") {
    return <p className="testimonial-source">Added by you</p>;
  }
  return (
    <p className="testimonial-source">
      <span className="testimonials__source">Submitted by client</span>
      {submission != null && (
        <>
          {" "}
          Their email, private notes and photos are on{" "}
          <Link
            href={formatAdminURL({ adminRoute: config.routes.admin, path: `/collections/testimonial-submissions/${submission}` })}
            prefetch={false}
          >
            their submission
          </Link>
          .
        </>
      )}
    </p>
  );
}
