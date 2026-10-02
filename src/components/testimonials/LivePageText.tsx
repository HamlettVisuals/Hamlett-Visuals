"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { TestimonialsPage } from "@/payload-types";

// /testimonials' own words from the Testimonials Page global (title, intro,
// the review section), following its form as she types in Live Preview.
// The quote font shows on publish (the page reloads).

type PageText = Pick<TestimonialsPage, "title" | "intro" | "showReviewSection" | "reviewHeading" | "reviewText">;

function useLivePage(initialData: PageText) {
  return useScopedLivePreview<PageText>({
    initialData,
    serverURL,
    globalSlug: "testimonials-page",
    apiRoute: "/hv-studio/api",
    depth: 0,
  }).data;
}

export function PageHeader({ page, children }: { page: PageText; children?: ReactNode }) {
  const data = useLivePage(page);
  return (
    <header id="testimonials-top" className="scroll-mt-6">
      <h1 className="font-display text-page text-ink">{data.title?.trim() || "Testimonials"}</h1>
      {data.intro?.trim() && <p className="mt-3 max-w-measure text-body text-muted">{data.intro.trim()}</p>}
      {children}
    </header>
  );
}

// TODO(backend pass): the testimonial form is only reachable from her
// one-time emailed link (/testimonial-request/[token]), so there's nowhere
// public for "Leave a review" to go yet; the section is off until there is
// (Testimonials Page, "Show the review section"). Point this at the public
// submission page once it exists.
const LEAVE_REVIEW_HREF = "#leave-a-review";

export function ReviewSection({ page }: { page: PageText }) {
  const data = useLivePage(page);
  if (!data.showReviewSection) return null;
  return (
    <section id="leave-a-review" aria-labelledby="leave-a-review-heading" className="mt-6 border-t border-hairline pt-12">
      <h2 id="leave-a-review-heading" className="font-display text-heading text-ink">
        {data.reviewHeading?.trim() || "Worked with me?"}
      </h2>
      {data.reviewText?.trim() && <p className="mt-3 max-w-measure text-body text-muted">{data.reviewText.trim()}</p>}
      <Link href={LEAVE_REVIEW_HREF} className="btn mt-6">
        Leave a review
      </Link>
    </section>
  );
}
