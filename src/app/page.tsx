import Link from "next/link";
import Hero from "@/components/home/Hero";
import Categories from "@/components/home/Categories";
import About from "@/components/home/About";
import FeaturedOffer from "@/components/home/FeaturedOffer";
import Offers from "@/components/home/Offers";
import BookingCta from "@/components/home/BookingCta";
import { instagramPosts, testimonialsTeaser } from "@/lib/site-content";

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
      <section id="instagram" className={sectionClass}>
        <h2 className={headingClass}>Recent Instagram</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {instagramPosts.map((post) => (
            <a
              key={post.id}
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex aspect-square items-center justify-center rounded-md bg-zinc-200 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {post.caption}
            </a>
          ))}
        </div>
      </section>

      {/* 8. Testimonials teaser */}
      <section id="testimonials" className={sectionClass}>
        <h2 className={headingClass}>Testimonials</h2>
        <div className="mt-6 flex flex-col gap-4">
          {testimonialsTeaser.map((testimonial) => (
            <blockquote
              key={testimonial.author}
              className="border-l-2 border-zinc-300 pl-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            >
              <p>&ldquo;{testimonial.quote}&rdquo;</p>
              <footer className="mt-1 text-zinc-500 dark:text-zinc-500">
                — {testimonial.author}
              </footer>
            </blockquote>
          ))}
        </div>
        <p className="mt-6">
          <Link href="/testimonials" className="underline">
            Read all testimonials
          </Link>
        </p>
      </section>

      {/* 9. Terms — anchor placeholder only, no copy yet */}
      <section id="terms" className={sectionClass}>
        <h2 className={headingClass}>Terms</h2>
      </section>
    </>
  );
}
