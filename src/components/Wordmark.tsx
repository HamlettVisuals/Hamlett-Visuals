import type { CSSProperties } from "react";
import Link from "next/link";
import type { Logo } from "@/payload-types";

// The studio mark, shared by the header (Nav) and the footer so both always
// show the same thing. Always links home.
//
// With a logo uploaded in Site Settings it renders that image; without one
// it falls back to the studio name set as type: Fraunces, weight 500,
// tracking pulled in to -0.02em so it reads as a mark rather than a body
// heading. Either way the name comes from Site Settings' siteName, and it
// doubles as the logo's alt text.
//
// The image is sized by height only (width follows its aspect ratio), so a
// wide wordmark and a square icon both fit the same slot. The max-width cap
// stops a very wide logo crowding the menu button on phones; past that cap
// object-contain shrinks the artwork inside the box instead of cropping or
// stretching it.
//
// The header logo's height is Site Settings' "Logo size" (`logoHeight`,
// 28–56px, default 40), passed in as the --logo-h custom property. Below the
// `header:` breakpoint (where the header collapses to the hamburger) it's
// drawn at 80% of that and capped at 140px wide; from `header:` up it's full
// height, capped at 180px. The header's own height is set by its tallest
// control — the Book button (38px) on desktop, the hamburger (44px) below
// `header:` — so sizes above those grow the header a little.

export const DEFAULT_LOGO_HEIGHT = 40;

const LOGO_CLASSES = {
  header:
    "h-[calc(var(--logo-h)*0.8)] max-w-[140px] object-left header:h-(--logo-h) header:max-w-[180px]",
  footer: "h-14 max-w-[260px] object-center",
} as const;

type WordmarkProps = {
  siteName: string;
  logo?: number | Logo | null;
  variant?: keyof typeof LOGO_CLASSES;
  // Header only: logo height in px (Site Settings' logoHeight).
  logoHeight?: number | null;
  onClick?: () => void;
};

export default function Wordmark({
  siteName,
  logo,
  variant = "header",
  logoHeight,
  onClick,
}: WordmarkProps) {
  // Unpopulated (bare id) or trashed/missing logos fall back to text too.
  const logoDoc = typeof logo === "object" && logo !== null ? logo : null;
  const display = logoDoc?.sizes?.display;
  const src = display?.url || logoDoc?.url;
  const width = (display?.url && display.width) || logoDoc?.width;
  const height = (display?.url && display.height) || logoDoc?.height;

  if (src) {
    return (
      <Link href="/" onClick={onClick} className="inline-flex shrink-0">
        {/* A plain <img>, not next/image: the pre-sized `display` rendition
            (Logos.ts) is already the right size, and next/image would need a
            fixed width this height-driven layout doesn't have. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={siteName}
          width={width ?? undefined}
          height={height ?? undefined}
          className={`block w-auto object-contain ${LOGO_CLASSES[variant]}`}
          style={
            variant === "header"
              ? ({
                  "--logo-h": `${logoHeight ?? DEFAULT_LOGO_HEIGHT}px`,
                } as CSSProperties)
              : undefined
          }
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      onClick={onClick}
      className="font-display text-title font-medium leading-none tracking-[-0.02em] text-ink"
    >
      {siteName}
    </Link>
  );
}
