"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getHeroSlides } from "@/lib/site-content";

// Cross-category filmstrip hero. One representative image per category
// (Weddings → Portraits → Pets → Brands → Motorsports → Real Estate → repeat),
// crossfading on the --hero-fade-duration token. The photo carries the section;
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

export default function Hero() {
  const heroSlides = getHeroSlides();
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
  useEffect(() => {
    if (prefersReducedMotion || paused || heroSlides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % heroSlides.length);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, [prefersReducedMotion, paused]);

  // Reduced motion: render a single static image (first category), no stacked
  // layers, and force the active layer back to that first image regardless of
  // where the rotation had reached before the preference was turned on.
  const slides = prefersReducedMotion ? heroSlides.slice(0, 1) : heroSlides;
  const activeIndex = prefersReducedMotion ? 0 : index;

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
            key={slide.categorySlug}
            className="absolute inset-0"
            aria-hidden={i === activeIndex ? undefined : true}
            style={{
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
            Moments, held.
          </h1>
          <p
            className="mt-4 max-w-md text-lead text-canvas/85"
            style={{ textShadow: "0 1px 16px rgba(23,22,20,0.45)" }}
          >
            Weddings, portraits, pets, and more — captured as they happen.
          </p>
          <div className="mt-8">
            <Link href="#booking-cta" className="btn">
              Book a session
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
