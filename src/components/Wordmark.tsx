import type { CSSProperties } from "react";
import Link from "next/link";
import { FOOTER_LOGO, HEADER_LOGO } from "@/lib/logo-size";
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
// Both heights come from Site Settings — "Header logo size" (`logoHeight`)
// and "Footer logo size" (`footerLogoHeight`) — passed in as the --logo-h
// custom property; ranges and defaults live in lib/logo-size.ts.
//
// Header: the header is a fixed height (72px desktop, 76px below `header:`),
// so the logo is clamped to fit inside it — full height up to 64px from
// `header:` up, capped at 180px wide; below it 80% of the setting, clamped
// to 68px and capped at 140px wide. The clamps also cover out-of-range
// values saved before the slider's range changed.
//
// Footer: the setting as-is, capped at 320px wide (80vw on narrow phones).

const LOGO_CLASSES = {
  header:
    "h-[min(calc(var(--logo-h)*0.8),68px)] max-w-[140px] object-left header:h-[min(var(--logo-h),64px)] header:max-w-[180px]",
  footer: "h-(--logo-h) max-w-[min(80vw,320px)] object-center",
} as const;

type WordmarkProps = {
  siteName: string;
  logo?: number | Logo | null;
  variant?: keyof typeof LOGO_CLASSES;
  // Logo height in px: Site Settings' logoHeight (header) or
  // footerLogoHeight (footer). Empty uses the default from lib/logo-size.ts.
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
  const drawnHeight =
    logoHeight ?? (variant === "header" ? HEADER_LOGO.default : FOOTER_LOGO.default);

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
          style={{ "--logo-h": `${drawnHeight}px` } as CSSProperties}
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
