import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { getPayload } from "payload";
import config from "@payload-config";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FloatingAskButton from "@/components/AskQuestion/FloatingAskButton";
import LivePreviewRefresh from "@/components/LivePreviewRefresh";
import LivePreviewHighlight from "@/components/LivePreviewHighlight";
import { getInstagramQrSvg } from "@/lib/instagram-qr";
import "../globals.css";

// Display / headings. Variable font — the opsz axis is kept so
// `font-optical-sizing: auto` (set in globals.css) gives a lighter, more open
// cut at hero scale and a sturdier cut at heading scale. No italic is loaded:
// italics are not a default style on this site.
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
  title: "Hamlett Visuals",
  description:
    "Weddings, portraits, pets, and more — captured as they happen.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Footer renders on every page (not just the homepage), so it's fetched
  // here rather than in (site)/page.tsx — same reasoning as the QR code,
  // which used to be fetched inside Footer.tsx itself before it needed to
  // become a client component for useLivePreview.
  const payload = await getPayload({ config });
  const finalCtaFooter = await payload.findGlobal({ slug: "final-cta-footer" });
  const siteSettings = await payload.findGlobal({ slug: "site-settings" });
  const qrSvg = await getInstagramQrSvg(
    siteSettings.instagram?.url || "https://www.instagram.com/hamlettvisuals/",
  );

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer
          finalCtaFooter={finalCtaFooter}
          siteSettings={siteSettings}
          qrSvg={qrSvg}
        />
        <FloatingAskButton />
        <LivePreviewRefresh />
        <LivePreviewHighlight />
      </body>
    </html>
  );
}
