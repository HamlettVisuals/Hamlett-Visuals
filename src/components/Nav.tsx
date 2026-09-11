"use client";

import { useEffect, useRef, useState } from "react";
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

// Three bars that resolve into an X — a plain CSS transform, no icon library.
// Used for both the header toggle and the panel's own close button.
function MenuIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-4 w-[22px]">
      <span
        className={`absolute left-0 top-0 h-[1.5px] w-full bg-current transition-transform duration-200 ease-standard ${
          open ? "translate-y-[7px] rotate-45" : ""
        }`}
      />
      <span
        className={`absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-current transition-opacity duration-200 ease-standard ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute bottom-0 left-0 h-[1.5px] w-full bg-current transition-transform duration-200 ease-standard ${
          open ? "-translate-y-[7px] -rotate-45" : ""
        }`}
      />
    </span>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    update(); // the page can load already scrolled (reload mid-page, hash link)
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Closing always hands focus back to the button that opened the panel.
  const closeMenu = () => {
    setMenuOpen(false);
    toggleButtonRef.current?.focus();
  };

  // Esc closes the panel.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Body-scroll lock while the panel is open — same pattern as
  // CategoryLightbox (src/components/Gallery/CategoryLightbox.tsx).
  useEffect(() => {
    if (!menuOpen) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [menuOpen]);

  // Take the rest of the page out of the tab order and a11y tree while the
  // panel is open — everything except the header (Nav) itself lives under
  // <main> and <Footer> in layout.tsx.
  useEffect(() => {
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (menuOpen) {
      main?.setAttribute("inert", "");
      footer?.setAttribute("inert", "");
    }
    return () => {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
    };
  }, [menuOpen]);

  // Focus the panel on open and trap Tab/Shift+Tab inside it while open.
  useEffect(() => {
    if (!menuOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
        <div className="hidden items-center gap-8 header:flex">
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

        {/* Collapsed: hamburger toggling the slide-in panel below. */}
        <button
          type="button"
          ref={toggleButtonRef}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-panel"
          className="-mr-2 flex h-11 w-11 items-center justify-center text-ink header:hidden"
        >
          <MenuIcon open={menuOpen} />
        </button>
      </nav>

      {/* Backdrop — dims the page and closes the panel on click. Stays
          mounted (not conditionally rendered) so the opacity transition can
          run in both directions; pointer-events are dropped while closed so
          it never intercepts clicks. */}
      <div
        aria-hidden="true"
        onClick={closeMenu}
        className={`nav-panel-backdrop fixed inset-0 z-40 bg-ink/40 header:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Slide-in panel. Capped width so it reads as a panel, not a
          full-screen takeover; a hairline left border (not a shadow) plus
          the dimmed backdrop mark its edge, per the site's flat surfaces. */}
      <div
        id="mobile-nav-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!menuOpen}
        className={`nav-panel fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-[340px] flex-col border-l border-hairline bg-canvas header:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-end px-5 py-5">
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="-mr-2 flex h-11 w-11 -scale-x-100 items-center justify-center text-ink"
          >
            <MenuIcon open={true} />
          </button>
        </div>

        <ul className="flex flex-col border-t border-hairline px-6 pt-2">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={closeMenu}
                className="link block py-4 text-lead text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto px-6 pb-8 pt-6">
          <Link href={BOOK_HREF} onClick={closeMenu} className="btn w-full">
            Book
          </Link>
        </div>
      </div>
    </header>
  );
}
