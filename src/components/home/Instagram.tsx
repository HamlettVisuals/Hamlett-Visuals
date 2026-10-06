"use client";

import HoverZoomImage from "@/components/HoverZoomImage";
import PlayIcon from "@/components/Backstage/PlayIcon";
import type { InstagramLink } from "@/lib/contact-details";
import type { InstagramHome } from "@/lib/instagram-home";
import { instagramView, type ViewBlock } from "@/lib/instagram-view";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { InstagramSection, SiteSetting } from "@/payload-types";

// Recent on Instagram section (#instagram), between the Booking CTA and the
// Testimonials teaser. Set up in the studio's Instagram Section
// (globals/InstagramSection.ts); the posts are the synced copies saved by
// the daily sync (lib/instagram-sync.ts), never Instagram itself.
//
//   - One account shown: a 3×3 grid. Both: two labelled 3×2 blocks, side
//     by side from `lg`, stacked below that, each with its own Follow link.
//     Which posts and which layout: lib/instagram-layout.ts; what to
//     render: lib/instagram-view.ts.
//   - Nothing to show (no account connected, switched on and synced): the
//     heading and a "Follow @handle" link made from Site Settings'
//     Instagram username, so the section and Live Preview never go blank.
//   - Switched off, or nowhere to send people: left out.
//
// Tiles are 4:5 with the site's one hover effect (HoverZoomImage) and the
// #instagram-only softened corners (--radius-media, DESIGN.md). Videos and
// reels get a play badge, carousels a stacked badge; the caption is the alt
// text; each tile opens its post on Instagram in a new tab.
//
// Live Preview follows the section's own form (heading, switches, picks
// and their order); which accounts are connected and their recent posts
// come from the server.

const GRID_CLASS = "grid grid-cols-3 gap-1.5 sm:gap-3";

export default function Instagram({ home, siteSettings }: { home: InstagramHome; siteSettings: SiteSetting }) {
  const { data: section } = useScopedLivePreview<InstagramSection>({
    initialData: home.section,
    serverURL,
    globalSlug: "instagram-section",
    apiRoute: "/hv-studio/api",
    depth: 1,
  });
  const { data: settings } = useScopedLivePreview<SiteSetting>({
    initialData: siteSettings,
    serverURL,
    globalSlug: "site-settings",
    apiRoute: "/hv-studio/api",
  });

  const view = instagramView(section, home, settings.instagram?.handle);
  if (view.kind === "hidden") return null;

  if (view.kind === "follow") {
    return (
      <Shell heading={view.heading} follow={view.follow}>
        {null}
      </Shell>
    );
  }

  if (view.kind === "single") {
    return (
      <Shell heading={view.heading} follow={view.block.link}>
        <Grid block={view.block} className="mt-8" sizes="(min-width: 1280px) 405px, 31vw" />
      </Shell>
    );
  }

  return (
    <Shell heading={view.heading} follow={null}>
      <div className="mt-8 grid gap-x-10 gap-y-12 lg:grid-cols-2">
        {view.blocks.map((block) => {
          const title = block.label || block.link?.handle || "Instagram";
          return (
            <section key={block.slot} aria-label={title} data-instagram-account={block.slot}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="text-body font-medium text-ink">{title}</h3>
                {block.link && <FollowLink link={block.link} />}
              </div>
              <Grid block={block} className="mt-4" sizes="(min-width: 1280px) 195px, (min-width: 1024px) 15vw, 31vw" />
            </section>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ heading, follow, children }: { heading: string; follow: InstagramLink | null; children: React.ReactNode }) {
  return (
    <section id="instagram" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-display text-heading text-ink">{heading}</h2>
          {follow && <FollowLink link={follow} />}
        </div>
        {children}
      </div>
    </section>
  );
}

function FollowLink({ link }: { link: InstagramLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="link inline-flex items-center gap-1.5 text-body text-ink"
    >
      <InstagramGlyph className="h-4 w-4" />
      Follow {link.handle}
    </a>
  );
}

function Grid({ block, className, sizes }: { block: ViewBlock; className: string; sizes: string }) {
  const link = block.link;
  return (
    <ul className={`${GRID_CLASS} ${className}`}>
      {block.posts.map((post) => (
        <li key={post.id}>
          <a
            href={post.permalink ?? link?.url ?? "https://www.instagram.com/"}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block overflow-hidden rounded-media"
            data-media-type={post.mediaType}
          >
            <HoverZoomImage
              src={post.url}
              alt={post.caption || `Instagram post by ${link?.handle ?? "Hamlett Visuals"}`}
              sizes={sizes}
              className="aspect-[4/5] w-full"
            />
            {post.mediaType !== "image" && (
              <>
                <span className="sr-only">{post.mediaType === "video" ? " (video)" : " (carousel)"}</span>
                <span
                  className="pointer-events-none absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/55 text-canvas"
                  aria-hidden="true"
                >
                  {post.mediaType === "video" ? <PlayIcon className="h-3 w-3 translate-x-px" /> : <StackIcon className="h-3.5 w-3.5" />}
                </span>
              </>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Two offset squares: Instagram's own "more than one photo" mark.
function StackIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <rect x="4.5" y="1.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 4.5v8.5a1.5 1.5 0 0 0 1.5 1.5h8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InstagramGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}
