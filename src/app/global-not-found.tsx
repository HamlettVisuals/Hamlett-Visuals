import Link from "next/link";
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Handles truly unmatched URLs across the whole app. Required once the app
// has multiple root layouts ((site) and (payload)) — see
// node_modules/next/dist/docs/.../file-conventions/not-found.md: with
// multiple root layouts there's no single layout to compose a global 404
// from, so this file bypasses layouts entirely and must import its own
// fonts/styles. Enabled via experimental.globalNotFound in next.config.ts.
// In-app notFound() calls within site routes still use
// src/app/(site)/not-found.tsx, which renders inside the site's Nav/Footer.

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Page not found — Hamlett Visuals",
  description: "That page doesn't exist, or may have moved.",
};

export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-gutter py-section text-center">
          <h1 className="font-display text-page text-ink">Page not found</h1>

          <p className="mt-4 max-w-measure text-body text-accent-text">
            That page doesn&rsquo;t exist, or may have moved.
          </p>

          <div className="mt-10 flex flex-col items-center gap-5">
            <Link href="/" className="btn">
              Back to home
            </Link>
            <Link href="/#categories" className="link text-ink">
              View the gallery
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
