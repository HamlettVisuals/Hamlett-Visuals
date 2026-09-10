import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { instagram } from "@/lib/site-content";
import { getInstagramQrSvg } from "@/lib/instagram-qr";

// Section 10 of the homepage flow — the final CTA / footer — and the site-wide
// footer rendered on every page via src/app/layout.tsx. On the design system:
// warm ground, hairline dividers, flat (no shadow), Fraunces labels over Inter
// values, one solid button. "Book a session" is the emphasis; everything else
// stays quiet.

// Every destination here resolves: Portfolio -> the homepage categories anchor
// (there is no /portfolio index route), and /backstage, /testimonials,
// /privacy-policy are all real routes.
const footerNav = [
  { href: "/#categories", label: "Portfolio" },
  { href: "/backstage", label: "Backstage" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

// TODO: placeholder contact details — swap hello@example.com, the phone
// number and the tagline for the real values before launch.
const EMAIL = "hello@example.com";
const PHONE_DISPLAY = "+0 000 000 0000";
const PHONE_HREF = "tel:+00000000000";

export default async function Footer() {
  const qrSvg = await getInstagramQrSvg();

  return (
    <footer id="footer" className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-gutter pt-section pb-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-8">
          {/* Brand + final CTA */}
          <div className="flex flex-col items-start gap-5">
            <Wordmark />
            <p className="max-w-xs text-caption text-muted">
              Placeholder one-line tagline.
            </p>
            <Link href="/booking" className="btn">
              Book a session
            </Link>
          </div>

          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
            {/* Contact */}
            <div className="flex flex-col gap-2">
              <h2 className="text-body text-ink">Contact</h2>
              <ul className="flex flex-col gap-1.5 text-caption text-muted">
                <li>
                  <a href={`mailto:${EMAIL}`} className="link">
                    {EMAIL}
                  </a>
                </li>
                <li>
                  <a href={PHONE_HREF} className="link">
                    {PHONE_DISPLAY}
                  </a>
                </li>
                <li>
                  <a
                    href={instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    {instagram.handle}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${EMAIL}?subject=Gift%20card`}
                    className="link"
                  >
                    Available as a gift &mdash; email to arrange
                  </a>
                </li>
              </ul>
            </div>

            {/* Follow / QR */}
            <div className="flex flex-col gap-3">
              <h2 className="text-body text-ink">Follow on Instagram</h2>
              <a
                href={instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${instagram.handle} on Instagram`}
                className="inline-block border border-hairline"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
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
          <p className="text-caption text-muted">
            &copy; {new Date().getFullYear()} Hamlet Visuals. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
