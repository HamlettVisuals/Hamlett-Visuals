"use client";

import { Suspense } from "react";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { Booking as BookingGlobal, Category } from "@/payload-types";
import BookingFlow from "./BookingFlow";

// Live Preview overlay for the Booking global (heading/intro/steps) — same
// mechanism as About.tsx/Instagram.tsx. Everything the Booking global drives
// (the header and BookingFlow's "How it works" card) lives under this one
// component so a single hook call covers all of it — see globals/Booking.ts
// for why the page's whole #booking container is the Live Preview highlight
// target rather than one sub-element.
export default function BookingPageContent({
  booking,
  categories,
  fallbackCategoryId,
  browsableSlugs,
}: {
  booking: BookingGlobal;
  categories: Category[];
  fallbackCategoryId: number | undefined;
  /** Categories with an album on show (the thank-you's gallery link). */
  browsableSlugs: string[];
}) {
  const { data } = useScopedLivePreview<BookingGlobal>({
    initialData: booking,
    serverURL,
    globalSlug: "booking",
    apiRoute: "/hv-studio/api",
  });

  const steps = (data.steps ?? []).map((step) => ({
    title: step.title,
    description: step.description,
  }));

  return (
    <>
      <header>
        <h1 className="font-display text-page text-ink">{data.heading}</h1>
        <p className="mt-3 max-w-measure text-body text-muted">{data.intro}</p>
      </header>

      <Suspense fallback={null}>
        <BookingFlow
          categories={categories}
          fallbackCategoryId={fallbackCategoryId}
          browsableSlugs={browsableSlugs}
          steps={steps}
          copy={{
            howItWorks: data.howItWorksHeading,
            dateHelp: data.dateHelpText,
            submitLabel: data.submitLabel,
            confirmationHeading: data.confirmationHeading,
            confirmationMessage: data.confirmationMessage,
          }}
        />
      </Suspense>
    </>
  );
}
