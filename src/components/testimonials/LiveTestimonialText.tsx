"use client";

import type { CSSProperties } from "react";
import { trimQuoteMarks } from "@/lib/quote-marks";
import { serverURL } from "@/lib/server-url";
import { useScopedCollectionLivePreview } from "@/lib/use-scoped-collection-live-preview";

// A /testimonials card's quote, name and context line. In Live Preview they
// follow the testimonial's unsaved form, but only on the card being edited
// (`?lpDoc=<id>`, see Testimonials.ts livePreview and
// lib/use-scoped-collection-live-preview.ts); every other card, and every
// visitor, gets the saved text. The photo, link, category and order follow
// on save. A cleared name shows the saved one; a cleared context shows the
// automatic line, as the site would.

type LiveFields = { id: number; quote?: string | null; clientName?: string | null; context?: string | null };

export default function LiveTestimonialText({
  id,
  quote,
  clientName,
  context,
  autoContext,
  quoteClassName,
  quoteStyle,
}: {
  id: number;
  quote: string;
  clientName: string;
  /** Her saved Context text, if any. */
  context: string | null;
  /** What shows when Context is empty. */
  autoContext: string;
  quoteClassName: string;
  quoteStyle?: CSSProperties;
}) {
  const { data } = useScopedCollectionLivePreview<LiveFields>({
    initialData: { id, quote, clientName, context },
    serverURL,
    collectionSlug: "testimonials",
    apiRoute: "/hv-studio/api",
    depth: 0,
  });

  return (
    <>
      <blockquote className={quoteClassName} style={quoteStyle}>
        &ldquo;{trimQuoteMarks(data.quote ?? quote)}&rdquo;
      </blockquote>
      <figcaption className="mt-4 text-caption">
        <span className="text-ink">{data.clientName?.trim() || clientName}</span>
        <span className="mt-0.5 block text-muted">{data.context?.trim() || autoContext}</span>
      </figcaption>
    </>
  );
}
