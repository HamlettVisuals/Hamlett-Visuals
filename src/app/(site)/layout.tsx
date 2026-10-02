import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { getPayload } from "payload";
import config from "@payload-config";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { emptyListingPages } from "@/lib/listing-pages";
import FloatingAskButton from "@/components/AskQuestion/FloatingAskButton";
import LivePreviewRefresh from "@/components/LivePreviewRefresh";
import LivePreviewHighlight from "@/components/LivePreviewHighlight";
import "../globals.css";

// Display / headings. Variable font — the opsz axis is kept so
// `font-optical-sizing: auto` (set in globals.css) gives a lighter, more open
// cut at hero scale and a sturdier cut at heading scale. No italic is loaded
// here: italics are not a default style on this site. The one exception is
// the testimonial quotes on /testimonials, the only place a third typeface
// (and italics) is allowed, chosen from the curated registry in
// lib/quote-fonts.ts (Lora by default) and loaded by that page alone.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
  variable: "--font-fraunces",
});

// Body / UI / nav / labels. Variable weight range; components use 400 and 500.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  // Without this, Next.js can't resolve the relative URLs in the dynamic
  // icon/opengraph-image routes below and falls back to localhost — which
  // is what real Open Graph/Twitter previews would show if this were left
  // unset (Next's own build warning: "metadataBase property in metadata
  // export is not set"). NEXT_PUBLIC_SITE_URL defaults to the current live
  // Vercel deployment for now — TODO: point this at her real domain once
  // she has one. It also needs to be set in Vercel's own project
  // environment variables (Project Settings -> Environment Variables), not
  // just here in .env.local — .env.local only covers local dev, and the
  // production build on Vercel won't see this fallback's intent otherwise
  // (it'll fall back to the vercel.app URL below, which still works, just
  // isn't the point).
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hamlett-visuals.vercel.app",
  ),
  title: "Hamlett Visuals",
  description:
    "Weddings, portraits, pets, and more — captured as they happen.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Nav and Footer render on every page (not just the homepage), so both
  // are fetched here rather than in (site)/page.tsx.
  const payload = await getPayload({ config });
  const headerNav = await payload.findGlobal({ slug: "header-nav" });
  const finalCtaFooter = await payload.findGlobal({ slug: "final-cta-footer" });
  const siteSettings = await payload.findGlobal({ slug: "site-settings" });
  // Footer links to a page with nothing published yet are left out (lib/listing-pages.ts).
  const emptyPages = await emptyListingPages(payload);

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Nav headerNav={headerNav} siteSettings={siteSettings} />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer
          finalCtaFooter={finalCtaFooter}
          siteSettings={siteSettings}
          hiddenHrefs={emptyPages}
        />
        <FloatingAskButton />
        <LivePreviewRefresh />
        <LivePreviewHighlight />
      </body>
    </html>
  );
}
