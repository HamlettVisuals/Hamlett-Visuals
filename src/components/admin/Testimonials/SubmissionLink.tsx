"use client";

import { useEffect, useState } from "react";
import { Link, useConfig, useDocumentInfo } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { getJSON } from "./api";

// On a client's submission: the testimonial it became (in Testimonials,
// hidden until she publishes it), where she reviews and approves it.
export default function SubmissionLink() {
  const { config } = useConfig();
  const { id } = useDocumentInfo();
  const [testimonial, setTestimonial] = useState<{ id: number; published?: boolean } | null | undefined>(undefined);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    if (!id) return;
    void getJSON<{ docs: { id: number; published?: boolean }[] }>(
      `${apiBase}/testimonials?where[submission][equals]=${id}&depth=0&limit=1&trash=true`,
    ).then((result) => setTestimonial(result?.docs[0] ?? null));
  }, [apiBase, id]);

  if (!id || testimonial === undefined) return null;
  return (
    <p className="testimonial-source">
      {testimonial ? (
        <>
          This arrived in Testimonials {testimonial.published ? "and is published" : "as hidden"}.{" "}
          <Link
            href={formatAdminURL({ adminRoute: config.routes.admin, path: `/collections/testimonials/${testimonial.id}` })}
            prefetch={false}
          >
            {testimonial.published ? "Open the testimonial" : "Review and publish it"}
          </Link>
          .
        </>
      ) : (
        "No testimonial was made from this submission."
      )}
    </p>
  );
}
