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
// stretching it. The header's height is set by its tallest control — the
// Book button (38px) on desktop, the hamburger (44px) below `header:` — so
// the header logo stays at 36px to fit under both and never changes it.

const LOGO_CLASSES = {
  header: "h-9 max-w-[min(55vw,240px)] object-left",
  footer: "h-14 max-w-[260px] object-center",
} as const;

type WordmarkProps = {
  siteName: string;
  logo?: number | Logo | null;
  variant?: keyof typeof LOGO_CLASSES;
  onClick?: () => void;
};

export default function Wordmark({
  siteName,
  logo,
  variant = "header",
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
