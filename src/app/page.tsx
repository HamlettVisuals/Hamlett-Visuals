import Hero from "@/components/home/Hero";
import Categories from "@/components/home/Categories";
import About from "@/components/home/About";
import FeaturedOffer from "@/components/home/FeaturedOffer";
import Offers from "@/components/home/Offers";
import BookingCta from "@/components/home/BookingCta";
import Instagram from "@/components/home/Instagram";
import Testimonials from "@/components/home/Testimonials";

// Single flowing homepage. Sections render in this exact order:
//  1. Hero            (<Hero />)
//  2. Categories      (#categories)
//  3. About           (#about)
//  4. Hot offer       (#hot-offer)
//  5. Offers & pricing(#offers)
//  6. Booking CTA     (#booking-cta)
//  7. Recent Instagram(#instagram)
//  8. Testimonials    (#testimonials)
//  9. Terms           (#terms, anchor placeholder only)
// 10. Final CTA/footer -> global <Footer /> in src/app/layout.tsx
//
// Markup is intentionally plain and minimally styled — the design pass is next.

const sectionClass = "mx-auto max-w-4xl px-6 py-16";
const headingClass =
  "text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50";

export default function Home() {
  return (
    <>
      {/* 1. Hero */}
      <Hero />

      {/* 2. Categories */}
      <Categories />

      {/* 3. About */}
      <About />

      {/* 4. Hot offer */}
      <FeaturedOffer />

      {/* 5. Offers & pricing */}
      <Offers />

      {/* 6. General booking CTA */}
      <BookingCta />

      {/* 7. Recent Instagram */}
      <Instagram />

      {/* 8. Testimonials teaser */}
      <Testimonials />

      {/* 9. Terms — anchor placeholder only, no copy yet */}
      <section id="terms" className={sectionClass}>
        <h2 className={headingClass}>Terms</h2>
      </section>
    </>
  );
}
