"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Single-page site: most nav items are anchors into the homepage sections;
// booking and testimonials are their own routed pages. Plain placeholder markup.
//
// The header is sticky (pinned to the viewport top) on a solid --color-canvas
// background so scrolling content never shows through. Its hairline bottom
// border only appears once the page has scrolled a few pixels — at the very
// top there's no line, so the Hero reads flush with the header. The border is
// always present at 1px (transparent → hairline) so toggling it never shifts
// layout.
const links = [
  { href: "/#categories", label: "Portfolio" },
  { href: "/#about", label: "About" },
  { href: "/#offers", label: "Pricing" },
  { href: "/#instagram", label: "Instagram" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/booking", label: "Book" },
];

// A few pixels — enough to mean "we've left the top" without flickering on
// sub-pixel scroll jitter or elastic overscroll.
const SCROLL_THRESHOLD = 4;

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    update(); // the page can load already scrolled (reload mid-page, hash link)
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-canvas transition-colors duration-150 ${
        scrolled ? "border-hairline" : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Hamlet Visuals
        </Link>
        <ul className="flex flex-wrap gap-4 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
