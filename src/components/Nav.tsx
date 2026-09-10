"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";

// Single-page site: most nav items are anchors into the homepage sections;
// Testimonials and Book are their own routed pages.
//
// The header is sticky (pinned to the viewport top) on a solid --color-canvas
// background so scrolling content never shows through. Its hairline bottom
// border only appears once the page has scrolled a few pixels — at the very
// top there's no line, so the Hero reads flush with the header. The border is
// always present at 1px (transparent -> hairline) so toggling it never shifts
// layout. This scroll/border behaviour is unchanged from the previous pass.
//
// The logo is the shared <Wordmark> (also used in the footer).

// Destinations are unchanged. Book is split out below: it renders as the one
// solid button, not a quiet link.
const navLinks = [
  { href: "/#categories", label: "Portfolio" },
  { href: "/#about", label: "About" },
  { href: "/#offers", label: "Pricing" },
  { href: "/#instagram", label: "Instagram" },
  { href: "/testimonials", label: "Testimonials" },
];

const BOOK_HREF = "/booking";

// A few pixels — enough to mean "we've left the top" without flickering on
// sub-pixel scroll jitter or elastic overscroll.
const SCROLL_THRESHOLD = 4;

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    update(); // the page can load already scrolled (reload mid-page, hash link)
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Esc closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-canvas transition-colors duration-150 ${
        scrolled ? "border-hairline" : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Wordmark onClick={() => setMenuOpen(false)} />

        {/* Desktop: quiet .link items, then the one solid Book button. */}
        <div className="hidden items-center gap-8 md:flex">
          <ul className="flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="link text-caption text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={BOOK_HREF} className="btn">
            Book
          </Link>
        </div>

        {/* Mobile: hamburger toggling the panel below. */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          className="-mr-2 flex h-11 w-11 items-center justify-center text-ink md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            {menuOpen ? (
              <path
                d="M5 5l12 12M17 5 5 17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 6h16M3 11h16M3 16h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile panel. Height animates via grid-template-rows 0fr -> 1fr (no
          magic max-height); still under prefers-reduced-motion (the global
          safety net in globals.css plus motion-reduce here). `inert` keeps the
          collapsed links out of tab order and the accessibility tree. */}
      <div
        id="mobile-nav"
        inert={!menuOpen}
        className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-standard motion-reduce:transition-none md:hidden ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="flex flex-col border-t border-hairline px-6 py-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="link block py-3 text-body text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 mb-1">
              <Link
                href={BOOK_HREF}
                onClick={() => setMenuOpen(false)}
                className="btn w-full"
              >
                Book
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
