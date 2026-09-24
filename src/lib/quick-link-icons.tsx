// Icons for the About section's quick-link cards (components/home/About.tsx),
// chosen from where each card goes (its `href`, one of lib/nav-destinations.ts),
// so she never has to pick one. 16×16, 1.3px strokes in currentColor, like
// the original Backstage and Testimonials icons. A destination without its
// own icon gets the plain arrow-in-a-circle.

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const icons: Record<string, React.ReactNode> = {
  // Backstage: a play button in a frame (reels). This one and Testimonials
  // are the original About icons, unchanged.
  "/backstage": (
    <>
      <rect x="1.6" y="3.4" width="12.8" height="9.2" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M6.5 6.1 10.3 8l-3.8 1.9V6.1Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </>
  ),
  // Testimonials, both the page and the homepage preview: a speech bubble.
  "/testimonials": (
    <>
      <path
        d="M3.4 3h9.2A2 2 0 0 1 14.6 5v4a2 2 0 0 1-2 2H8l-3.4 2.5V11h-1.2A2 2 0 0 1 1.4 9V5A2 2 0 0 1 3.4 3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M5.2 6.4h5.6M5.2 8.4h3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  // Booking: a calendar.
  "/booking": (
    <>
      <rect x="2" y="3.2" width="12" height="10.6" rx="1.6" {...stroke} />
      <path d="M2 6.6h12M5.3 1.8v2.6M10.7 1.8v2.6" {...stroke} />
    </>
  ),
  // Instagram: the rounded-square camera.
  "/#instagram": (
    <>
      <rect x="2" y="2" width="12" height="12" rx="3.4" {...stroke} />
      <circle cx="8" cy="8" r="2.7" {...stroke} />
      <circle cx="11.6" cy="4.4" r="0.6" fill="currentColor" />
    </>
  ),
  // Portfolio: a photo (mountains and sun).
  "/#categories": (
    <>
      <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.6" {...stroke} />
      <path d="m2.4 11.6 3.6-3.8 2.6 2.6 1.8-1.8 3.2 3.2" {...stroke} />
      <circle cx="10.6" cy="5.8" r="1" {...stroke} />
    </>
  ),
  // Pricing and the popular offer: a price tag.
  "/#offers": (
    <>
      <path d="M8.6 1.8h4.1a1.5 1.5 0 0 1 1.5 1.5v4.1L7.6 14a1.4 1.4 0 0 1-2 0L2 10.4a1.4 1.4 0 0 1 0-2Z" {...stroke} />
      <circle cx="11" cy="5" r="1" fill="currentColor" />
    </>
  ),
};
icons["/#testimonials"] = icons["/testimonials"];
icons["/#booking-cta"] = icons["/booking"];
icons["/#hot-offer"] = icons["/#offers"];

// Everything else (Home, About, Privacy, Terms…): an arrow in a circle.
const fallback = (
  <>
    <circle cx="8" cy="8" r="6.2" {...stroke} />
    <path d="M5.6 8h4.8M8.4 6l2 2-2 2" {...stroke} />
  </>
);

export function QuickLinkIcon({ href }: { href: string | null | undefined }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {(href && icons[href]) || fallback}
    </svg>
  );
}
