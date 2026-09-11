import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import "./globals.css";

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
  description: "Photography portfolio of Hamlett Visuals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
