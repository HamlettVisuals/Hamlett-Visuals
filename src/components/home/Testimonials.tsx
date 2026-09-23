"use client";

import Link from "next/link";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { Category, Testimonial, TestimonialsTeaser } from "@/payload-types";

// Testimonials teaser (#testimonials), between the Instagram grid and the Terms
// anchor. Shows whichever Testimonials collection docs are flagged
// `featured` (fetched in (site)/page.tsx) — two, side by side on desktop,
// stacked on mobile. Static: no carousel, no rotation.
//
// Each block is plain text on the page ground — a quiet category label, the
// quote at text-lead, then the client name and context. Flat: no border, no
// card, no shadow (DESIGN.md → flat surfaces). The full set lives on
// /testimonials, linked from the heading row the same way the Instagram
// section links its handle.

function resolveCategory(category: Testimonial["category"]): Category | null {
  return typeof category === "object" && category !== null ? category : null;
}

export default function Testimonials({
  testimonialsTeaser,
  featuredTestimonials,
}: {
  testimonialsTeaser: TestimonialsTeaser;
  featuredTestimonials: Testimonial[];
}) {
  // Live Preview for the heading/link row — same mechanism as the other
  // wired globals. The quotes below come from the Testimonials collection
  // fetch in page.tsx, which only gets plain (unscoped) Live Preview — see
  // payload.config.ts.
  const { data } = useScopedLivePreview<TestimonialsTeaser>({
    initialData: testimonialsTeaser,
    serverURL,
    globalSlug: "testimonials-teaser",
    apiRoute: "/hv-studio/api",
  });

  return (
    <section id="testimonials" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-display text-heading text-ink">{data.heading}</h2>
          <Link href={data.linkHref || "/testimonials"} className="link text-body text-ink">
            {data.linkLabel}
          </Link>
        </div>

        <div className="mt-8 grid gap-10 sm:grid-cols-2 sm:gap-12">
          {featuredTestimonials.map((testimonial) => {
            const category = resolveCategory(testimonial.category);
            return (
              <figure key={testimonial.id}>
                <p className="text-caption text-muted">{category?.name}</p>
                <blockquote className="mt-2 max-w-measure text-lead text-ink">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-3 text-caption">
                  <span className="text-ink">{testimonial.clientName}</span>
                  {testimonial.context && (
                    <span className="mt-0.5 block text-muted">
                      {testimonial.context}
                    </span>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
