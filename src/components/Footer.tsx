"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { contactDetails } from "@/lib/contact-details";
import { LEGAL_LINKS } from "@/lib/footer-limits";
import { getInstagramQrSvg } from "@/lib/instagram-qr";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { FinalCtaFooter, SiteSetting } from "@/payload-types";

// Section 10 of the homepage flow — the closing note / footer — and the
// site-wide footer rendered on every page via src/app/(site)/layout.tsx.
//
// One centred, stacked column: wordmark, her closing line, the solid Book
// button (the footer's one point of emphasis), then the contact details and
// Instagram follow block she's switched on, her links, and the fixed
// copyright + legal links row. On the design system:
// warm ground, flat (no shadow, no card), Fraunces for the wordmark / sign-off
// / labels, Inter for values.

export default function Footer({
  finalCtaFooter,
  siteSettings,
  qrSvg,
  qrUrl,
}: {
  finalCtaFooter: FinalCtaFooter;
  siteSettings: SiteSetting;
  /** QR code for the saved Instagram link (`qrUrl`), drawn on the server. */
  qrSvg: string;
  qrUrl: string | null;
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

  // The QR code is drawn on the server for the saved Instagram link; while
  // the username is edited in Live Preview, redraw it here so it keeps
  // pointing where the link does.
  const [liveQr, setLiveQr] = useState<{ url: string; svg: string } | null>(null);
  const instagramUrl = instagram?.url ?? null;
  useEffect(() => {
    if (!instagramUrl || instagramUrl === qrUrl) return;
    let cancelled = false;
    getInstagramQrSvg(instagramUrl).then((svg) => {
      if (!cancelled) setLiveQr({ url: instagramUrl, svg });
    });
    return () => {
      cancelled = true;
    };
  }, [instagramUrl, qrUrl]);
  const qr =
    instagramUrl === qrUrl
      ? qrSvg
      : liveQr?.url === instagramUrl
        ? liveQr.svg
        : null;

  // Which contact details show: switched on in the footer editor AND filled
  // in on Site Settings. The QR code is never shown on phones (below `sm`),
  // where it can't be scanned, so a block holding only the QR code is left
  // out there entirely.
  const showEmail = data.showEmail !== false && email;
  const showPhone = data.showPhone !== false && phone;
  const showHandle = data.showInstagram !== false && instagram;
  const showQr = data.showQrCode !== false && instagram;
  const qrOnly = showQr && !showEmail && !showPhone && !showHandle;
  const siteName = settings.siteName || "Hamlett Visuals";

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

        {(showEmail || showPhone || showHandle || showQr) && (
          <div className={`mt-14 flex-col items-center ${qrOnly ? "hidden sm:flex" : "flex"}`}>
            {(showEmail || showPhone) && (
              <div className="flex flex-col items-center gap-1.5 text-caption text-muted">
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
              </div>
            )}

            {instagram && (showHandle || showQr) && (
              <div
                className={`flex-col items-center gap-3 ${showEmail || showPhone ? "mt-10" : ""} ${
                  showHandle ? "flex" : "hidden sm:flex"
                }`}
              >
                <h2 className="text-body text-ink">Follow on Instagram</h2>
                {showHandle && (
                  <a
                    href={instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link text-caption text-ink"
                  >
                    {instagram.handle}
                  </a>
                )}
                {showQr && (
                  <a
                    href={instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${instagram.handle} on Instagram`}
                    className="mt-1 hidden min-h-[128px] min-w-[128px] border border-hairline sm:inline-block"
                    dangerouslySetInnerHTML={{ __html: qr ?? "" }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Her links: one per line, centred, on phones and tablets; one row
            from `lg` (1024px) up, where FOOTER_LINKS_MAX links at the label
            cap fit without wrapping (lib/footer-limits.ts). */}
        {(data.footerNav ?? []).length > 0 && (
          <nav
            aria-label="Footer"
            className="mt-16 flex flex-col items-center gap-2 lg:flex-row lg:justify-center lg:gap-x-6"
          >
            {(data.footerNav ?? []).map((item) => (
              <Link
                key={item.id ?? item.href}
                href={item.href}
                className="link whitespace-nowrap text-caption text-ink"
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
