import { getPayload } from "payload";
import config from "@payload-config";
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
//  9. Final CTA/footer -> global <Footer /> in src/app/layout.tsx
//
// Terms & conditions live on /terms, not on the homepage.

export default async function Home() {
  const payload = await getPayload({ config });
  const hero = await payload.findGlobal({ slug: "hero" });
  const about = await payload.findGlobal({ slug: "about" });
  const categoriesIntro = await payload.findGlobal({ slug: "categories-intro" });
  const featuredOffer = await payload.findGlobal({ slug: "featured-offer" });
  const { docs: pricingRows } = await payload.find({
    collection: "pricing-rows",
    depth: 1,
    sort: "order",
    limit: 0,
  });
  const testimonialsTeaser = await payload.findGlobal({
    slug: "testimonials-teaser",
  });
  const siteSettings = await payload.findGlobal({ slug: "site-settings" });

  return (
    <>
      {/* 1. Hero */}
      <Hero hero={hero} />

      {/* 2. Categories */}
      <Categories categoriesIntro={categoriesIntro} />

      {/* 3. About */}
      <About about={about} />

      {/* 4. Hot offer */}
      <FeaturedOffer featuredOffer={featuredOffer} pricingRows={pricingRows} />

      {/* 5. Offers & pricing */}
      <Offers pricingRows={pricingRows} />

      {/* 6. General booking CTA */}
      <BookingCta siteSettings={siteSettings} />

      {/* 7. Recent Instagram */}
      <Instagram siteSettings={siteSettings} />

      {/* 8. Testimonials teaser */}
      <Testimonials testimonialsTeaser={testimonialsTeaser} />
    </>
  );
}
