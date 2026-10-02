"use client";

import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { contactDetails } from "@/lib/contact-details";
import { LEGAL_LINKS } from "@/lib/footer-limits";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { FinalCtaFooter, SiteSetting } from "@/payload-types";

// Section 10 of the homepage flow — the closing note / footer — and the
// site-wide footer rendered on every page via src/app/(site)/layout.tsx.
//
// One centred, stacked column: wordmark, her closing line, the solid Book
// button (the footer's one point of emphasis), then the contact details she's
// switched on (email, phone, Instagram handle), her links, and the fixed
// copyright + legal links row. On the design system:
// warm ground, flat (no shadow, no card), Fraunces for the wordmark / sign-off
// / labels, Inter for values.

// A link to a page with nothing published yet (Backstage, Testimonials) is
// left out until that page has something, like About's quick links:
// `hiddenHrefs` comes from lib/listing-pages.ts via the layout.
export default function Footer({
  finalCtaFooter,
  siteSettings,
  hiddenHrefs = [],
}: {
  finalCtaFooter: FinalCtaFooter;
  siteSettings: SiteSetting;
  hiddenHrefs?: string[];
}) {
  // Two separate globals render in this one component, so two separate
  // (scoped) Live Preview subscriptions — one per document. See
  // use-scoped-live-preview.ts for why each needs its own hook instance
  // rather than sharing the stock useLivePreview.
  const { data } = useScopedLivePreview<FinalCtaFooter>({
    initialData: finalCtaFooter,
    serverURL,
    globalSlug: "final-cta-footer",
    apiRoute: "/hv-studio/api",
  });
  const { data: settings } = useScopedLivePreview<SiteSetting>({
    initialData: siteSettings,
    serverURL,
    globalSlug: "site-settings",
    apiRoute: "/hv-studio/api",
  });

  const { email, phone, instagram } = contactDetails(settings);

  // Which contact details show, in this order: switched on in the footer
  // editor AND filled in on Site Settings. Instagram is the @handle, linking
  // to the profile in a new tab.
  const showEmail = data.showEmail !== false && email;
  const showPhone = data.showPhone !== false && phone;
  const showInstagram = data.showInstagram !== false && instagram;
  const siteName = settings.siteName || "Hamlett Visuals";
  const footerNav = (data.footerNav ?? []).filter((item) => !hiddenHrefs.includes(item.href));

  return (
    <footer id="footer" className="border-t border-hairline bg-canvas-tint">
      {/* pb-28 keeps the last line clear of the fixed "Ask a question" button
          (AskQuestion/FloatingAskButton.tsx) when scrolled to the bottom. */}
      <div className="mx-auto flex max-w-5xl flex-col items-center px-gutter pt-section pb-28 text-center">
        <Wordmark
          siteName={siteName}
          logo={settings.logo}
          logoHeight={settings.footerLogoHeight}
          variant="footer"
        />

        <p className="mt-5 max-w-md font-display text-title text-ink">
          {data.signOffLine}
        </p>

        <Link href={data.ctaHref || "/booking"} className="btn mt-8">
          {data.ctaLabel || "Book a session"}
        </Link>

        {(showEmail || showPhone || showInstagram) && (
          <div className="mt-14 flex flex-col items-center gap-1.5 text-caption text-muted">
            {showEmail && (
              <a href={`mailto:${email}`} className="link">
                {email}
              </a>
            )}
            {showPhone && phone && (
              <a href={phone.href} className="link">
                {phone.display}
              </a>
            )}
            {showInstagram && instagram && (
              <a
                href={instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                {instagram.handle}
              </a>
            )}
          </div>
        )}

        {/* Her links: one centred row at every width, same 24px spacing as
            desktop. Below `lg` (1024px) the row may wrap onto further centred
            lines if links are added; from `lg` up FOOTER_LINKS_MAX links at
            the label cap fit without wrapping (lib/footer-limits.ts). Below
            `lg` each link gets 12.5px of vertical padding for a ~44px tap
            target, and the nav's margins give that padding back so the text
            sits exactly where it did before. */}
        {footerNav.length > 0 && (
          <nav
            aria-label="Footer"
            className="-mb-[12.5px] mt-[calc(4rem-12.5px)] flex flex-wrap items-center justify-center gap-x-6 lg:mb-0 lg:mt-16 lg:flex-nowrap"
          >
            {footerNav.map((item) => (
              <Link
                key={item.id ?? item.href}
                href={item.href}
                className="link whitespace-nowrap py-[12.5px] text-caption text-ink lg:py-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Fixed, not editable: the copyright line (studio name from Site
            Settings, this year) and the legal pages beside it. */}
        <div className="mt-8 flex flex-col items-center gap-1.5 text-caption text-muted sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4">
          <p>
            &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex gap-x-4">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="link text-muted">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
