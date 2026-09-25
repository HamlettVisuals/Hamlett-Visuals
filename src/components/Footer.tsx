"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { contactDetails } from "@/lib/contact-details";
import { getInstagramQrSvg } from "@/lib/instagram-qr";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { FinalCtaFooter, SiteSetting } from "@/payload-types";

// Section 10 of the homepage flow — the closing note / footer — and the
// site-wide footer rendered on every page via src/app/(site)/layout.tsx.
//
// One centred, stacked column: wordmark, a warm sign-off line, the solid Book
// button (the footer's one point of emphasis), then contact, the Instagram
// follow block, the utility nav, and the copyright. On the design system:
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

  return (
    <footer id="footer" className="border-t border-hairline bg-canvas-tint">
      <div className="mx-auto flex max-w-md flex-col items-center px-gutter pt-section pb-16 text-center">
        <Wordmark
          siteName={settings.siteName || "Hamlett Visuals"}
          logo={settings.logo}
          variant="footer"
        />

        <p className="mt-5 font-display text-title text-ink">
          {data.signOffLine}
        </p>

        <Link href={data.ctaHref || "/booking"} className="btn mt-8">
          {data.ctaLabel || "Book a session"}
        </Link>

        {(email || phone) && (
          <div className="mt-14 flex flex-col items-center gap-1.5 text-caption text-muted">
            {email && (
              <a href={`mailto:${email}`} className="link">
                {email}
              </a>
            )}
            {phone && (
              <a href={phone.href} className="link">
                {phone.display}
              </a>
            )}
          </div>
        )}

        {instagram && (
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
              className="mt-1 inline-block min-h-[128px] min-w-[128px] border border-hairline"
              dangerouslySetInnerHTML={{ __html: qr ?? "" }}
            />
          </div>
        )}

        <nav className="mt-16 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {(data.footerNav ?? []).map((item) => (
            <Link
              key={item.id ?? item.href}
              href={item.href}
              className="link text-caption text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="mt-6 text-caption text-muted">
          &copy; {new Date().getFullYear()} {data.copyrightName || "Hamlett Visuals"}
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}
