"use client";

import Link from "next/link";
import { featuredTestimonials } from "@/lib/site-content";
import { getCategories } from "@/lib/categories";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { TestimonialsTeaser } from "@/payload-types";

// Testimonials teaser (#testimonials), between the Instagram grid and the Terms
// anchor. Shows only the entries flagged `featured` in `testimonials`
// (src/lib/site-content.ts) — two, side by side on desktop, stacked on mobile.
// Static: no carousel, no rotation.
//
// Each block is plain text on the page ground — a quiet category label, the
// quote at text-lead, then the client name and context. Flat: no border, no
// card, no shadow (DESIGN.md → flat surfaces). The full set lives on
// /testimonials, linked from the heading row the same way the Instagram
// section links its handle.

const categoryName = (slug: string) =>
  getCategories().find((category) => category.slug === slug)?.name ?? "";

export default function Testimonials({
  testimonialsTeaser,
}: {
  testimonialsTeaser: TestimonialsTeaser;
}) {
  // Live Preview for the heading/link row — same mechanism as the other
  // wired globals. The quotes below still come from the static
  // featuredTestimonials list, not this data — the Testimonials collection
  // stays out of scope for this pass.
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
          {featuredTestimonials.map((testimonial) => (
            <figure key={testimonial.clientName}>
              <p className="text-caption text-muted">
                {categoryName(testimonial.categorySlug)}
              </p>
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
          ))}
        </div>
      </div>
    </section>
  );
}
