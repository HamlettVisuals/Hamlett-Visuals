"use client";

import { useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { generateAltText } from "@/lib/generate-alt-text";
import { resolvePhoto } from "@/lib/resolve-photo";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import { HERO_PHOTOS_MAX, secondsPerPhoto } from "@/lib/hero-limits";
import { focalPosition } from "@/lib/focal-position";
import type { Category, Hero as HeroGlobal, Photo } from "@/payload-types";

// Filmstrip hero. The slides are the Hero global's "Hero slides", in the
// order she picked; left empty, it falls back to one representative image
// per category (in category order), crossfading on the --hero-fade-duration
// token. Every slide is cropped around its photo's focal point, so the
// subject stays in frame at desktop, tablet and phone aspect ratios. Below
// 1024px (the header's breakpoint) a slide's mobile image, if it has one,
// replaces the main image, positioned by its own focal point; a <picture>
// source means each device downloads only the image it shows. The photo
// carries the section; the scrim is kept to a soft wash behind the text
// only, so the image stays bright and true everywhere else.
//
// Controls: a row of slide indicators (the active bar fills over the hold)
// with a pause/play button, arrow keys while the hero has focus, and swipe
// on touch. Autoplay pauses on mouse hover, keyboard focus and a hidden tab.
//
// Motion rules (see DESIGN.md → Motion): the crossfade and the indicator
// fill are the hero's only movements. Under prefers-reduced-motion it never
// rotates by itself: it starts on the first slide, the indicators still
// switch slides (a cut, no fade), and the pause button is left out. While it
// does rotate, pause is always offered (WCAG 2.2.2).

// A horizontal swipe at least this long (and mostly sideways) changes slide.
const SWIPE_MIN_PX = 40;

type HeroSlide = {
  key: string;
  alt: string;
  photo: Photo;
  mobilePhoto: Photo | null;
};

// Same width-only resizing as next/image (the whole photo, never a
// pre-cropped copy, so the focal-point positioning has the full frame to
// work with), split across a <picture> so the mobile image is only fetched
// below 1024px and the main image only above it. Each has its own focal
// point, applied per breakpoint through the --focal-* variables. With no
// mobile image there's no <source>, and the main image is used everywhere.
// `unoptimized`: an unsaved slide in Live Preview (useScopedLivePreview `live`).
function HeroImage({ slide, eager, unoptimized = false }: { slide: HeroSlide; eager: boolean; unoptimized?: boolean }) {
  const common = { alt: slide.alt, fill: true, sizes: "100vw", quality: 90, unoptimized };
  const { props } = getImageProps({
    ...common,
    src: slide.photo.url!,
    loading: eager ? "eager" : undefined,
    fetchPriority: eager ? "high" : undefined,
  });
  const mobile = slide.mobilePhoto;
  const mobileSrcSet = mobile
    ? getImageProps({ ...common, src: mobile.url! }).props.srcSet
    : undefined;
  return (
    <picture>
      {mobileSrcSet && (
        // Matches Tailwind's max-lg (and the header's breakpoint).
        <source media="(width < 64rem)" srcSet={mobileSrcSet} sizes="100vw" />
      )}
      <img
        {...props}
        alt={slide.alt}
        className="object-cover [object-position:var(--focal-mobile)] lg:[object-position:var(--focal-desktop)]"
        style={
          {
            ...props.style,
            "--focal-desktop": focalPosition(slide.photo),
            "--focal-mobile": focalPosition(mobile ?? slide.photo),
          } as React.CSSProperties
        }
      />
    </picture>
  );
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
  const { data, live } = useScopedLivePreview<HeroGlobal>({
    initialData: hero,
    serverURL,
    globalSlug: "hero",
    apiRoute: "/hv-studio/api",
  });

  // The picked slides, in order — any whose main image can't be resolved
  // (e.g. moved to the Trash, which Payload populates as null) are skipped,
  // as is a repeat of a main image already in the list. A mobile image that
  // can't be resolved just falls back to the main image.
  const pickedIds = new Set<number>();
  const pickedSlides: HeroSlide[] = (data.slides ?? [])
    .flatMap((slide) => {
      const photo = resolvePhoto(slide.photo);
      if (!photo?.url || pickedIds.has(photo.id)) return [];
      pickedIds.add(photo.id);
      const mobile = resolvePhoto(slide.mobilePhoto);
      return [
        {
          key: `photo-${photo.id}`,
          alt: photo.alt,
          photo,
          mobilePhoto: mobile?.url ? mobile : null,
        },
      ];
    })
    .slice(0, HERO_PHOTOS_MAX);

  // Fallback: one slide per category — its banner photo, else its tile
  // cover photo. Categories with neither are skipped rather than shown with
  // a missing image.
  const categorySlides: HeroSlide[] = categories.flatMap((category) => {
    const photo =
      resolvePhoto(category.heroPhoto) ?? resolvePhoto(category.coverPhoto);
    if (!photo?.url) return [];
    return [
      {
        key: `category-${category.slug}`,
        alt: generateAltText({ kind: "category", category: category.name }),
        photo,
        mobilePhoto: null,
      },
    ];
  });

  const heroSlides = pickedSlides.length > 0 ? pickedSlides : categorySlides;
  // How long each image is held before advancing: her "Seconds per photo"
  // (4.5s unless she's changed it). The --hero-fade-duration (1200ms)
  // crossfade overlaps the tail of this window and doesn't change with it.
  // Follows Live Preview like the rest of `data`; a new value applies to the
  // active bar straight away.
  const holdMs = secondsPerPhoto(data.secondsPerPhoto) * 1000;
  const slideCount = heroSlides.length;
  const [index, setIndex] = useState(0);
  // Bumped on every slide change, to restart the active bar's fill.
  const [cycle, setCycle] = useState(0);
  // The pause/play button. Hover, keyboard focus and a hidden tab pause too,
  // but only for as long as they last.
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Track the reduced-motion preference (and react if it changes at runtime).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setTabHidden(document.visibilityState === "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // The slide count can change under Live Preview (slides added, removed or
  // reordered), so the index wraps against it.
  const activeIndex = index % Math.max(slideCount, 1);
  const hasControls = slideCount > 1;
  const running =
    hasControls && !prefersReducedMotion && !paused && !hovered && !keyboardFocus && !tabHidden;

  const goTo = (next: number) => {
    setIndex(((next % slideCount) + slideCount) % slideCount);
    setCycle((value) => value + 1);
  };

  return (
    <section
      id="top"
      aria-label="Featured work"
      aria-roledescription={hasControls ? "carousel" : undefined}
      // Focusable so the arrow keys work once it has focus; focus from the
      // keyboard also pauses it.
      tabIndex={hasControls ? 0 : undefined}
      className="relative isolate flex min-h-[88svh] w-full touch-pan-y items-end overflow-hidden bg-ink focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-canvas"
      onKeyDown={(event) => {
        if (!hasControls || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        goTo(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
      }}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setKeyboardFocus(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false);
      }}
      // Mouse only: a tap on a touch screen fires pointerenter but never
      // pointerleave, which would leave it paused.
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || !hasControls) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        // A clear sideways swipe; anything more vertical is a page scroll.
        if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        goTo(activeIndex + (dx < 0 ? 1 : -1));
      }}
    >
      {/* Image stack — full-bleed background. Sibling layers crossfade by
          opacity; only the active one is exposed to assistive tech, which
          hears about slide changes only while it isn't rotating by itself.
          The crop-frame idea from HoverZoomImage (a fixed, overflow-hidden
          box the image fills with object-cover) applies here too, minus the
          hover. */}
      <div className="absolute inset-0 -z-10" aria-live={running ? "off" : "polite"}>
        {heroSlides.map((slide, i) => (
          <div
            key={slide.key}
            className="absolute inset-0"
            role={hasControls ? "group" : undefined}
            aria-roledescription={hasControls ? "slide" : undefined}
            aria-label={hasControls ? `${i + 1} of ${slideCount}` : undefined}
            aria-hidden={i === activeIndex ? undefined : true}
            style={{
              // Makes cqw/cqh in the image's object-position this frame's
              // size — see lib/focal-position.ts.
              containerType: "size",
              opacity: i === activeIndex ? 1 : 0,
              // Token-driven; the globals.css reduced-motion safety net
              // collapses this to ~0ms, so a slide change there is a cut.
              transition: "opacity var(--hero-fade-duration) var(--ease-standard)",
            }}
          >
            <HeroImage slide={slide} eager={i === 0} unoptimized={live} />
          </div>
        ))}
      </div>

      {/* Scrim — behind the text only; see .hero-scrim in globals.css. */}
      <div aria-hidden className="hero-scrim pointer-events-none absolute inset-0 -z-10" />

      {/* Text block — lower-left, with the slide indicators under it. The
          soft, wide text-shadow is a last guard for bright photos. */}
      <div className="relative mx-auto w-full max-w-7xl px-gutter pb-16">
        <div className="max-w-2xl">
          <h1
            className="font-display text-hero font-normal text-canvas"
            style={{ textShadow: "0 2px 32px rgb(0 0 0 / 0.28)" }}
          >
            {data.headline}
          </h1>
          {data.subhead && (
            <p
              className="mt-4 max-w-md text-lead text-canvas/90"
              style={{ textShadow: "0 1px 24px rgb(0 0 0 / 0.3)" }}
            >
              {data.subhead}
            </p>
          )}
          <div className="mt-8">
            <Link href={data.ctaHref || "#booking-cta"} className="btn btn-light">
              {data.ctaLabel || "Book a session"}
            </Link>
          </div>
          {/* Slide indicators — one short bar per slide, under the button and
              lined up with the text; the active one fills over the hold
              (holdMs), then the slideshow moves on (see .hero-indicator-fill
              in globals.css). Each bar sits in a 28px-tall button so it's easy
              to hit. In the text's flow rather than pinned to the hero's
              bottom edge, which on phones is only just above the fixed "Ask a
              question" button. Hidden with a single slide. Under reduced
              motion nothing rotates: the active bar is simply full, and the
              bars still switch slides. */}
          {hasControls && (
            <div className="hero-indicators mt-8 flex items-center sm:mt-10">
              {heroSlides.map((slide, i) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show slide ${i + 1} of ${slideCount}`}
                  aria-current={i === activeIndex ? "true" : undefined}
                  className="group flex h-7 w-11 cursor-pointer items-center pr-2"
                >
                  <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/45 transition-colors group-hover:bg-white/70">
                    {i === activeIndex &&
                      (prefersReducedMotion ? (
                        <span className="hero-indicator-fill" />
                      ) : (
                        <span
                          key={cycle}
                          className="hero-indicator-fill hero-indicator-fill--animated"
                          style={{
                            animationDuration: `${holdMs}ms`,
                            animationPlayState: running ? "running" : "paused",
                          }}
                          onAnimationEnd={() => goTo(activeIndex + 1)}
                        />
                      ))}
                  </span>
                </button>
              ))}
              {!prefersReducedMotion && (
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  aria-label={paused ? "Play the slideshow" : "Pause the slideshow"}
                  className="ml-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center text-white/75 transition-colors hover:text-white"
                >
                  <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 fill-current">
                    {paused ? (
                      <path d="M5 3.5v9l7-4.5-7-4.5Z" />
                    ) : (
                      <path d="M4.5 3h2.5v10H4.5V3ZM9 3h2.5v10H9V3Z" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
