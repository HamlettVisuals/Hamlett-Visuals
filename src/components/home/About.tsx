"use client";

import Image from "next/image";
import Link from "next/link";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { About as AboutGlobal } from "@/payload-types";

// About section (#about). An editorial two-column block: the photographer's
// portrait on the left (~40% on desktop), the bio on the right, and two link
// chips stacked below the bio. Collapses to portrait-above-text on mobile.
//
// The portrait is a static image and is deliberately NOT wrapped in
// <HoverZoomImage> — the hover-zoom is reserved for gallery / grid thumbnails,
// not a lone portrait (see DESIGN.md → Motion).
//
// The two "more of her" sub-pages below the bio aren't part of the About
// global — they're fixed site navigation, not editorial content, so they
// stay hardcoded here rather than becoming CMS fields.
const chips = [
  {
    href: "/backstage",
    label: "Backstage",
    title: "Reels & behind the scenes",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect
          x="1.6"
          y="3.4"
          width="12.8"
          height="9.2"
          rx="1.8"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M6.5 6.1 10.3 8l-3.8 1.9V6.1Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/testimonials",
    label: "Testimonials",
    title: "Client stories",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3.4 3h9.2A2 2 0 0 1 14.6 5v4a2 2 0 0 1-2 2H8l-3.4 2.5V11h-1.2A2 2 0 0 1 1.4 9V5A2 2 0 0 1 3.4 3Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M5.2 6.4h5.6M5.2 8.4h3.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function About({ about }: { about: AboutGlobal }) {
  // Live Preview overlays the admin's current unsaved form state on top of
  // `about` via postMessage — same mechanism as Hero.tsx. `apiRoute` matters
  // more here than it did for Hero: `portrait` is an upload relation, and
  // depth-populating it while editing goes through this route.
  const { data } = useScopedLivePreview<AboutGlobal>({
    initialData: about,
    serverURL,
    globalSlug: "about",
    apiRoute: "/hv-studio/api",
  });

  const portrait =
    data.portrait && typeof data.portrait === "object" ? data.portrait : null;

  return (
    <section id="about" className="border-t border-hairline bg-canvas-tint">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">{data.heading}</h2>

        <div className="mt-8 grid gap-8 md:grid-cols-[2fr_3fr] md:gap-12">
          {/* Portrait — static, no hover-zoom. Falls back to the placeholder
              SVG until a real photo is set on the About global. */}
          <Image
            src={portrait?.url ?? "/about/portrait.svg"}
            alt={
              portrait?.alt ??
              "Placeholder portrait of the photographer behind Hamlett Visuals"
            }
            width={800}
            height={1000}
            sizes="(min-width: 768px) 40vw, 100vw"
            className="w-full self-start"
          />

          <div>
            {data.bio && (
              <RichText
                data={data.bio}
                className="flex max-w-measure flex-col gap-4 text-body text-muted"
              />
            )}

            <div className="mt-8 flex max-w-sm flex-col gap-3">
              {chips.map((chip) => (
                <Link key={chip.href} href={chip.href} className="link-chip">
                  <span className="link-chip-icon">{chip.icon}</span>
                  <span>
                    <span className="link-chip-label">{chip.label}</span>
                    <span className="link-chip-title">{chip.title}</span>
                  </span>
                  <span className="link-chip-arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
