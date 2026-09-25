"use client";

import Link from "next/link";
import { serverURL } from "@/lib/server-url";
import { availableTestimonials } from "@/lib/teaser-testimonials";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { Testimonial, TestimonialsTeaser } from "@/payload-types";

// Testimonials teaser (#testimonials, "In their words"), after the
// Instagram grid. Shows the testimonials picked in the Testimonials Teaser
// global, in her order, skipping any that have since been hidden or trashed
// (lib/teaser-testimonials.ts); with none left the section isn't rendered.
// Static: no carousel, no rotation.
//
// Text only: the quote, then the client's name and a quiet second line (her
// "context" line if she wrote one, e.g. "Wedding, June 2025", otherwise the
// testimonial's category). Flat: no border, no card, no shadow (DESIGN.md →
// flat surfaces). Stacked on phones; from tablet up the layout follows the
// count — one large centred quote, two side by side, three in columns on
// desktop, four as a 2×2 grid. Long quotes are clamped (QUOTE_LINES) so a
// row stays balanced; the full text is on /testimonials, linked from the
// heading row.

// Measured on the real section — see the note in lib/testimonials-teaser-limits.ts.
const QUOTE_LINES_SINGLE = "line-clamp-5";
const QUOTE_LINES_GRID = "line-clamp-6";

const GRID_BY_COUNT: Record<number, string> = {
  2: "grid gap-10 md:grid-cols-2 md:gap-12",
  3: "grid gap-10 lg:grid-cols-3 lg:gap-12",
  4: "grid gap-10 md:grid-cols-2 md:gap-x-12 md:gap-y-14",
};

function secondLine(testimonial: Testimonial): string | null {
  if (testimonial.context?.trim()) return testimonial.context.trim();
  const category = testimonial.category;
  return typeof category === "object" && category !== null ? category.name : null;
}

export default function Testimonials({
  testimonialsTeaser,
}: {
  testimonialsTeaser: TestimonialsTeaser;
}) {
  // Heading, link and the picks all follow the form in Live Preview; the
  // picks arrive as ids and are populated at depth 2 (testimonial, then its
  // category), same as the server fetch in page.tsx.
  const { data } = useScopedLivePreview<TestimonialsTeaser>({
    initialData: testimonialsTeaser,
    serverURL,
    globalSlug: "testimonials-teaser",
    apiRoute: "/hv-studio/api",
    depth: 2,
  });

  const testimonials = availableTestimonials(data.testimonials);
  if (testimonials.length === 0) return null;
  const single = testimonials.length === 1;

  return (
    <section id="testimonials" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-display text-heading text-ink">{data.heading}</h2>
          <Link href={data.linkHref || "/testimonials"} className="link text-body text-ink">
            {data.linkLabel}
          </Link>
        </div>

        <div className={single ? "mx-auto mt-10 max-w-2xl text-center" : `mt-8 ${GRID_BY_COUNT[testimonials.length]}`}>
          {testimonials.map((testimonial) => {
            const detail = secondLine(testimonial);
            return (
              <figure key={testimonial.id} className="flex flex-col">
                <blockquote
                  className={
                    single
                      ? `font-display text-title text-ink ${QUOTE_LINES_SINGLE}`
                      : `max-w-measure text-lead text-ink ${QUOTE_LINES_GRID}`
                  }
                >
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className={`text-caption ${single ? "mt-4" : "mt-3"}`}>
                  <span className="text-ink">{testimonial.clientName}</span>
                  {detail && <span className="mt-0.5 block text-muted">{detail}</span>}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
