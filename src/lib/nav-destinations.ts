// The full list of real, working link destinations on the site — used to
// populate the "where does this link go" dropdown on both the Header/Nav
// and Final CTA/Footer globals (src/globals/HeaderNav.ts,
// src/globals/FinalCtaFooter.ts), so she can add/reorder/remove nav links
// herself without being able to type a broken one.
//
// THIS IS THE ONE PLACE TO EDIT when a page or homepage section is added,
// removed, or renamed — both globals import from here, so there's nothing
// else to keep in sync. Each `value` must be the real href it points to:
// a page route (e.g. "/backstage") or a homepage anchor (e.g. "/#about",
// matching the `id` on that <section> in src/components/home/*.tsx).
export const navDestinations = [
  { label: "Home", value: "/" },
  { label: "Portfolio (homepage section)", value: "/#categories" },
  { label: "About (homepage section)", value: "/#about" },
  { label: "Pricing (homepage section)", value: "/#offers" },
  { label: "Popular Offer (homepage section)", value: "/#hot-offer" },
  { label: "Booking prompt (homepage section)", value: "/#booking-cta" },
  { label: "Instagram (homepage section)", value: "/#instagram" },
  { label: "Testimonials preview (homepage section)", value: "/#testimonials" },
  { label: "Booking (page)", value: "/booking" },
  { label: "Backstage (page)", value: "/backstage" },
  { label: "Testimonials (page)", value: "/testimonials" },
  { label: "Privacy Policy (page)", value: "/privacy-policy" },
  { label: "Terms & Conditions (page)", value: "/terms" },
] as const;
