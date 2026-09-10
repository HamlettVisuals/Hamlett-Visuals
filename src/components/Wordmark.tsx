import Link from "next/link";

// The "Hamlet Visuals" wordmark: Fraunces, weight 500, tracking pulled in to
// -0.02em so it reads as a mark rather than a body heading. Shared by the
// header (Nav) and the footer so the studio name is "set" the same way in
// both places. Always links home.
//
// TODO: this is a typographic placeholder. If a drawn logo/mark is ever made,
// swap an SVG lockup in here and both call sites pick it up.

type WordmarkProps = {
  className?: string;
  onClick?: () => void;
};

export default function Wordmark({ className = "", onClick }: WordmarkProps) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className={`font-display text-title font-medium leading-none tracking-[-0.02em] text-ink ${className}`}
    >
      Hamlet Visuals
    </Link>
  );
}
