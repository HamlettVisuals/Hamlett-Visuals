import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { instagram } from "@/lib/site-content";
import { getInstagramQrSvg } from "@/lib/instagram-qr";

// Section 10 of the homepage flow — the closing note / footer — and the
// site-wide footer rendered on every page via src/app/layout.tsx.
//
// One centred, stacked column: wordmark, a warm sign-off line, the solid Book
// button (the footer's one point of emphasis), then contact, the Instagram
// follow block, the utility nav, and the copyright. On the design system:
// warm ground, flat (no shadow, no card), Fraunces for the wordmark / sign-off
// / labels, Inter for values.

// Every destination here resolves: Portfolio -> the homepage categories anchor
// (there is no /portfolio index route), and /backstage, /testimonials,
// /privacy-policy are all real routes.
const footerNav = [
  { href: "/#categories", label: "Portfolio" },
  { href: "/backstage", label: "Backstage" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

// TODO: placeholder details — swap the email, phone number and the sign-off
// line for the real copy before launch.
const EMAIL = "hello@example.com";
const PHONE_DISPLAY = "+0 000 000 0000";
const PHONE_HREF = "tel:+00000000000";

export default async function Footer() {
  const qrSvg = await getInstagramQrSvg();

  return (
    <footer id="footer" className="border-t border-hairline">
      <div className="mx-auto flex max-w-md flex-col items-center px-gutter pt-section pb-16 text-center">
        <Wordmark />

        <p className="mt-5 font-display text-title text-ink">
          Let&rsquo;s make something worth keeping.
        </p>

        <Link href="/booking" className="btn mt-8">
          Book a session
        </Link>

        <div className="mt-14 flex flex-col items-center gap-1.5 text-caption text-muted">
          <a href={`mailto:${EMAIL}`} className="link">
            {EMAIL}
          </a>
          <a href={PHONE_HREF} className="link">
            {PHONE_DISPLAY}
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <h2 className="text-body text-ink">Follow on Instagram</h2>
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link text-caption text-ink"
          >
            {instagram.handle}
          </a>
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${instagram.handle} on Instagram`}
            className="mt-1 inline-block border border-hairline"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>

        <nav className="mt-16 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {footerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link text-caption text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="mt-6 text-caption text-muted">
          &copy; {new Date().getFullYear()} Hamlett Visuals. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
