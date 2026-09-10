import Link from "next/link";
import { instagram } from "@/lib/site-content";

// Section 10 of the homepage flow — the final CTA / footer — and also the
// site-wide footer rendered on every page via src/app/layout.tsx.
// Plain placeholder markup; the design pass handles layout and styling.

const footerNav = [
  // "Portfolio" points at the homepage categories section (there is no
  // /portfolio index route).
  { href: "/#categories", label: "Portfolio" },
  { href: "/backstage", label: "Backstage" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

export default function Footer() {
  return (
    <footer
      id="footer"
      className="border-t border-zinc-200 dark:border-zinc-800"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex flex-col gap-3">
          <div className="flex h-12 w-32 items-center justify-center rounded bg-zinc-200 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Logo
          </div>
          <p>Placeholder one-line tagline.</p>
          <p>
            <Link href="/booking" className="underline">
              Book a session
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-zinc-950 dark:text-zinc-50">
              Contact
            </p>
            <p>Email: hello@example.com (placeholder)</p>
            <p>
              Instagram:{" "}
              <a
                href={instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {instagram.handle}
              </a>
            </p>
            <p>Phone: +0 000 000 0000 (placeholder)</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-medium text-zinc-950 dark:text-zinc-50">
              Follow on Instagram
            </p>
            <div className="flex h-24 w-24 items-center justify-center rounded bg-zinc-200 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              QR
            </div>
            <span className="w-fit rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
              Gift cards available
            </span>
          </div>
        </div>

        <nav className="flex flex-wrap gap-4">
          {footerNav.map((item) => (
            <Link key={item.label} href={item.href} className="underline">
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="text-zinc-500 dark:text-zinc-500">
          © {new Date().getFullYear()} Hamlet Visuals. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
