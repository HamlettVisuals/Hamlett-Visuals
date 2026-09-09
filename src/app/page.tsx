import Link from "next/link";
import Hero from "@/components/home/Hero";
import {
  categories,
  hotOffer,
  instagramPosts,
  offers,
  testimonialsTeaser,
} from "@/lib/site-content";

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
      <section id="categories" className={sectionClass}>
        <h2 className={headingClass}>Categories</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/portfolio/${category.slug}`}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="flex h-28 items-center justify-center rounded-md bg-zinc-200 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Image
              </div>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">
                {category.name}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {category.blurb}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. About */}
      <section id="about" className={sectionClass}>
        <h2 className={headingClass}>About</h2>
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Portrait
          </div>
          <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Placeholder bio content. A few sentences about Hamlet Visuals, the
            photographer, background, and approach will go here once the design
            pass begins.
          </p>
        </div>
      </section>

      {/* 4. Hot offer */}
      <section
        id="hot-offer"
        className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className={sectionClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {hotOffer.eyebrow}
          </p>
          <h2 className={`${headingClass} mt-2`}>{hotOffer.name}</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            {hotOffer.details}
          </p>
          <p className="mt-6">
            <Link href={hotOffer.bookHref} className="underline">
              Book this offer
            </Link>
          </p>
        </div>
      </section>

      {/* 5. Offers & pricing */}
      <section id="offers" className={sectionClass}>
        <h2 className={headingClass}>Offers &amp; pricing</h2>
        <div className="mt-6 flex flex-col gap-10">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="flex flex-col gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800"
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {offer.category}
                </p>
                <h3 className="mt-1 text-lg font-medium text-zinc-950 dark:text-zinc-50">
                  {offer.name}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {offer.details}
                </p>
              </div>
              <div className="flex gap-3">
                {offer.gallery.map((label) => (
                  <div
                    key={label}
                    className="flex h-20 w-20 items-center justify-center rounded-md bg-zinc-200 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <p>
                <Link href={offer.bookHref} className="underline">
                  Book
                </Link>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. General booking CTA */}
      <section
        id="booking-cta"
        className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className={`${sectionClass} text-center`}>
          <h2 className={headingClass}>Ready to book?</h2>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            Placeholder booking call-to-action copy.
          </p>
          <p className="mt-6">
            <Link href="/booking" className="underline">
              Go to booking
            </Link>
          </p>
        </div>
      </section>

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
