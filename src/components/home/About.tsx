"use client";

import Image from "next/image";
import Link from "next/link";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import { QuickLinkIcon } from "@/lib/quick-link-icons";
import type { About as AboutGlobal } from "@/payload-types";

// About section (#about). An editorial two-column block: the photographer's
// portrait on the left (~40% on desktop), the bio on the right, and the
// quick-link cards stacked below the bio. Collapses to portrait-above-text
// on mobile.
//
// The portrait is a static image and is deliberately NOT wrapped in
// <HoverZoomImage> — the hover-zoom is reserved for gallery / grid thumbnails,
// not a lone portrait (see DESIGN.md → Motion).
//
// The cards come from the About global's `quickLinks` (globals/About.ts;
// limits in lib/about-limits.ts). Each card's icon follows its destination
// (lib/quick-link-icons.tsx). A card going to a page with nothing published
// yet (Backstage, Testimonials), or to Privacy Policy or Terms while it has
// no text, is left out until it has something: `hiddenHrefs` comes from
// lib/listing-pages.ts and lib/legal-pages.ts. With no links, the cards
// block isn't rendered at all, so no margin is left behind.
export default function About({
  about,
  hiddenHrefs = [],
}: {
  about: AboutGlobal;
  hiddenHrefs?: string[];
}) {
  // Live Preview overlays the admin's current unsaved form state on top of
  // `about` via postMessage — same mechanism as Hero.tsx. `apiRoute` matters
  // more here than it did for Hero: `portrait` is an upload relation, and
  // depth-populating it while editing goes through this route.
  const { data, live } = useScopedLivePreview<AboutGlobal>({
    initialData: about,
    serverURL,
    globalSlug: "about",
    apiRoute: "/hv-studio/api",
  });

  const portrait =
    data.portrait && typeof data.portrait === "object" ? data.portrait : null;
  // Rows being typed into in the editor can be half-filled; a card needs a
  // destination and a title to be worth showing, and a destination that
  // isn't an empty page.
  const quickLinks = (data.quickLinks ?? []).filter(
    (link) => link?.href && link.title?.trim() && !hiddenHrefs.includes(link.href),
  );

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
            unoptimized={live}
          />

          {/* Only when there's something in it: an empty column would still
              add the grid gap under the portrait on phones. */}
          {(data.bio || quickLinks.length > 0) && (
            <div>
              {data.bio && (
                <RichText
                  data={data.bio}
                  className="flex max-w-measure flex-col gap-4 text-body text-muted"
                />
              )}

              {quickLinks.length > 0 && (
                <div className="mt-8 flex max-w-sm flex-col gap-3">
                  {quickLinks.map((link, i) => (
                    <Link
                      key={link.id ?? i}
                      href={link.href}
                      className="link-chip"
                    >
                      <span className="link-chip-icon">
                        <QuickLinkIcon href={link.href} />
                      </span>
                      <span>
                        {link.label?.trim() && (
                          <span className="link-chip-label">{link.label}</span>
                        )}
                        <span className="link-chip-title">{link.title}</span>
                      </span>
                      <span className="link-chip-arrow" aria-hidden="true">
                        &rarr;
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
