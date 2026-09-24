"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { generateAltText } from "@/lib/generate-alt-text";
import { resolvePhoto } from "@/lib/resolve-photo";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import { HERO_PHOTOS_MAX } from "@/lib/hero-limits";
import type { Category, Hero as HeroGlobal, Photo } from "@/payload-types";

// Filmstrip hero. The slides are the Hero global's "Hero photos", in the
// order she picked; left empty, it falls back to one representative image
// per category (in category order), crossfading on the --hero-fade-duration
// token. Every slide is cropped around its photo's focal point, so the
// subject stays in frame at desktop, tablet and phone aspect ratios. The photo carries the section;
// the scrim is kept to a soft patch behind the text only, so the image stays
// bright and true everywhere else.
//
// Motion rules (see DESIGN.md → Motion): the crossfade is one of only two
// sanctioned movements on the site. Under prefers-reduced-motion it does not
// rotate at all — a single static image, no transition — and while it does
// rotate a pause control is always offered (WCAG 2.2.2).

// How long each image is held fully visible before advancing, in ms. The
// --hero-fade-duration (1200ms) crossfade overlaps the tail of this window.
const HOLD_MS = 4500;

// object-position that centres the photo's focal point in the frame, as far
// as the crop allows. Pure CSS so it's right on first paint at any size: the
// slide's frame is a size container (see below), so cqw/cqh are its width
// and height, and the object-cover image's rendered size is
// max(frame, frame scaled to the photo's aspect ratio). The offset is then
// clamped so the image never pulls away from an edge. Photos without stored
// dimensions fall back to the plain percentage (focal point in frame, just
// not centred). No focal point set means 50/50 — the centre, as before.
function focalPosition(photo: Photo) {
  const fx = (photo.focalX ?? 50) / 100;
  const fy = (photo.focalY ?? 50) / 100;
  if (!photo.width || !photo.height) return `${fx * 100}% ${fy * 100}%`;
  const ratio = photo.width / photo.height;
  const renderedWidth = `max(100cqw, 100cqh * ${ratio})`;
  const renderedHeight = `max(100cqh, 100cqw / ${ratio})`;
  const x = `clamp(100cqw - ${renderedWidth}, 50cqw - ${fx} * ${renderedWidth}, 0px)`;
  const y = `clamp(100cqh - ${renderedHeight}, 50cqh - ${fy} * ${renderedHeight}, 0px)`;
  return `${x} ${y}`;
}

export default function Hero({
  hero,
  categories,
}: {
  hero: HeroGlobal;
  categories: Category[];
}) {
  // Live Preview overlays the admin's current unsaved form state on top of
  // `hero` via postMessage — no extra fetch needed for these plain text
  // fields. Outside of Payload's Live Preview iframe this is a no-op and
  // `data` just stays equal to the server-fetched `hero` prop. Scoped to
  // the "hero" global specifically — see use-scoped-live-preview.ts for why
  // the stock useLivePreview hook isn't used here.
  const { data } = useScopedLivePreview<HeroGlobal>({
    initialData: hero,
    serverURL,
    globalSlug: "hero",
    apiRoute: "/hv-studio/api",
  });

  // The picked photos, in order — any that can't be resolved (e.g. moved to
  // the Trash, which Payload populates as null) are skipped, as is a repeat
  // of one already in the list.
  const pickedIds = new Set<number>();
  const pickedSlides = (data.heroPhotos ?? [])
    .flatMap((value) => {
      const photo = resolvePhoto(value);
      if (!photo?.url || pickedIds.has(photo.id)) return [];
      pickedIds.add(photo.id);
      return [
        {
          key: `photo-${photo.id}`,
          src: photo.url,
          alt: photo.alt,
          objectPosition: focalPosition(photo),
        },
      ];
    })
    .slice(0, HERO_PHOTOS_MAX);

  // Fallback: one slide per category — its banner photo, else its tile
  // cover photo. Categories with neither are skipped rather than shown with
  // a missing image.
  const categorySlides = categories.flatMap((category) => {
    const photo =
      resolvePhoto(category.heroPhoto) ?? resolvePhoto(category.coverPhoto);
    if (!photo?.url) return [];
    return [
      {
        key: `category-${category.slug}`,
        src: photo.url,
        alt: generateAltText({ kind: "category", category: category.name }),
        objectPosition: focalPosition(photo),
      },
    ];
  });

  const heroSlides = pickedSlides.length > 0 ? pickedSlides : categorySlides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Track the reduced-motion preference (and react if it changes at runtime).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Auto-advance, unless reduced motion is preferred or the viewer paused it.
  // The slide count can change under Live Preview (photos added, removed or
  // reordered), so it restarts the timer and the index wraps against it.
  const slideCount = heroSlides.length;
  useEffect(() => {
    if (prefersReducedMotion || paused || slideCount <= 1) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, [prefersReducedMotion, paused, slideCount]);

  // Reduced motion: render a single static image (first category), no stacked
  // layers, and force the active layer back to that first image regardless of
  // where the rotation had reached before the preference was turned on.
  const slides = prefersReducedMotion ? heroSlides.slice(0, 1) : heroSlides;
  const activeIndex = prefersReducedMotion ? 0 : index % Math.max(slideCount, 1);

  return (
    <section
      id="top"
      aria-label="Featured work"
      className="relative isolate flex min-h-[88svh] w-full items-end overflow-hidden bg-ink"
    >
      {/* Image stack — full-bleed background. Sibling layers crossfade by
          opacity; only the active one is exposed to assistive tech. The
          crop-frame idea from HoverZoomImage (a fixed, overflow-hidden box the
          image fills with object-cover) applies here too, minus the hover. */}
      <div className="absolute inset-0 -z-10">
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            className="absolute inset-0"
            aria-hidden={i === activeIndex ? undefined : true}
            style={{
              // Makes cqw/cqh in the image's object-position this frame's
              // size — see focalPosition().
              containerType: "size",
              opacity: i === activeIndex ? 1 : 0,
              // Token-driven; the globals.css reduced-motion safety net also
              // collapses this to ~0ms when the preference is set.
              transition: "opacity var(--hero-fade-duration) var(--ease-standard)",
            }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              preload={i === 0}
              sizes="100vw"
              quality={90}
              className="object-cover"
              style={{ objectPosition: slide.objectPosition }}
            />
          </div>
        ))}
      </div>

      {/* Scrim — a soft radial patch anchored to the lower-left, sized to sit
          behind the text block only. No full-image wash: the upper and right
          areas of the photo get no overlay at all. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(75% 70% at 8% 88%, rgba(23,22,20,0.74) 0%, rgba(23,22,20,0.42) 42%, rgba(23,22,20,0.12) 68%, rgba(23,22,20,0) 82%)",
        }}
      />

      {/* Text block — lower-left. text-shadow is the belt-and-braces contrast
          guard for bright shots where the scrim alone might not be enough. */}
      <div className="relative mx-auto w-full max-w-7xl px-gutter pb-14 sm:pb-20">
        <div className="max-w-2xl">
          <h1
            className="font-display text-hero font-normal text-canvas"
            style={{ textShadow: "0 1px 24px rgba(23,22,20,0.4)" }}
          >
            {data.headline}
          </h1>
          {data.subhead && (
            <p
              className="mt-4 max-w-md text-lead text-canvas/85"
              style={{ textShadow: "0 1px 16px rgba(23,22,20,0.45)" }}
            >
              {data.subhead}
            </p>
          )}
          <div className="mt-8">
            <Link href={data.ctaHref || "#booking-cta"} className="btn">
              {data.ctaLabel || "Book a session"}
            </Link>
          </div>
        </div>
      </div>

      {/* Pause control — only meaningful while something is auto-rotating, so
          it is omitted entirely under reduced motion. */}
      {!prefersReducedMotion && heroSlides.length > 1 && (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={
            paused ? "Resume the hero slideshow" : "Pause the hero slideshow"
          }
          className="absolute bottom-5 right-gutter z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-canvas/40 bg-ink/50 text-canvas backdrop-blur-sm transition-opacity hover:opacity-80"
        >
          {paused ? (
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="h-4 w-4 fill-current"
            >
              <path d="M5 3.5v9l7-4.5-7-4.5Z" />
            </svg>
          ) : (
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="h-4 w-4 fill-current"
            >
              <path d="M4.5 3h2.5v10H4.5V3ZM9 3h2.5v10H9V3Z" />
            </svg>
          )}
        </button>
      )}
    </section>
  );
}
