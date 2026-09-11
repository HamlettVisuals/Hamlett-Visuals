import Image from "next/image";
import Link from "next/link";

// About section (#about). An editorial two-column block: the photographer's
// portrait on the left (~40% on desktop), the bio on the right, and two link
// chips stacked below the bio. Collapses to portrait-above-text on mobile.
//
// The portrait is a static image and is deliberately NOT wrapped in
// <HoverZoomImage> — the hover-zoom is reserved for gallery / grid thumbnails,
// not a lone portrait (see DESIGN.md → Motion).
//
// Bio copy below is placeholder written in her voice for tone and length.
// TODO: replace with the photographer's own words before launch.

// The two "more of her" sub-pages. Each chip: a small leading icon, a
// small-caps label, a title line, and a trailing arrow. Styling lives in
// `.link-chip` (globals.css); the icons are inline SVGs since no icon library
// is installed yet, matching the inline-SVG approach already used in Hero.
const chips = [
  {
    href: "/backstage",
    label: "Backstage",
    title: "Reels & behind the scenes",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect
          x="1.6"
          y="3.4"
          width="12.8"
          height="9.2"
          rx="1.8"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M6.5 6.1 10.3 8l-3.8 1.9V6.1Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/testimonials",
    label: "Testimonials",
    title: "Client stories",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3.4 3h9.2A2 2 0 0 1 14.6 5v4a2 2 0 0 1-2 2H8l-3.4 2.5V11h-1.2A2 2 0 0 1 1.4 9V5A2 2 0 0 1 3.4 3Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M5.2 6.4h5.6M5.2 8.4h3.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function About() {
  return (
    <section id="about" className="border-t border-hairline bg-canvas-tint">
      <div className="mx-auto max-w-7xl px-gutter py-section">
        <h2 className="font-display text-heading text-ink">About</h2>

        <div className="mt-8 grid gap-8 md:grid-cols-[2fr_3fr] md:gap-12">
          {/* Portrait — static, no hover-zoom.
              TODO: swap the placeholder SVG for her real portrait
              (keep it portrait-oriented, roughly 4:5). */}
          <Image
            src="/about/portrait.svg"
            alt="Placeholder portrait of the photographer behind Hamlett Visuals"
            width={800}
            height={1000}
            sizes="(min-width: 768px) 40vw, 100vw"
            className="w-full self-start"
          />

          <div>
            <div className="flex max-w-measure flex-col gap-4 text-body text-muted">
              <p>
                I&rsquo;m the photographer behind Hamlett Visuals, and I&rsquo;ve
                spent the last several years learning that a good picture is
                mostly about paying attention. I shoot across all six of the
                things this studio is built on &mdash; weddings, portraits, pets,
                brands, motorsports, and real estate &mdash; and I like that the
                list refuses to sit still.
              </p>
              <p>
                My approach is the same whether it&rsquo;s a first dance or a
                first lap: stay close, stay quiet, and wait for the moment that
                was always going to happen. I&rsquo;d rather catch the real thing
                a half-second late than stage a tidy version of it. Editing stays
                light and warm, so the photos look like the day actually felt.
              </p>
              <p>
                However you found your way here, the goal doesn&rsquo;t change:
                to hand you back a set of images you&rsquo;ll still want to look
                at in ten years.
              </p>
            </div>

            <div className="mt-8 flex max-w-sm flex-col gap-3">
              {chips.map((chip) => (
                <Link key={chip.href} href={chip.href} className="link-chip">
                  <span className="link-chip-icon">{chip.icon}</span>
                  <span>
                    <span className="link-chip-label">{chip.label}</span>
                    <span className="link-chip-title">{chip.title}</span>
                  </span>
                  <span className="link-chip-arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
