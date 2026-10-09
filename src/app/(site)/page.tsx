import { getPayload } from "payload";
import config from "@payload-config";
import Hero from "@/components/home/Hero";
import Categories from "@/components/home/Categories";
import About from "@/components/home/About";
import { emptyLegalPages } from "@/lib/legal-pages";
import { emptyListingPages } from "@/lib/listing-pages";
import FeaturedOffer from "@/components/home/FeaturedOffer";
import Offers from "@/components/home/Offers";
import BookingCta from "@/components/home/BookingCta";
import Instagram from "@/components/home/Instagram";
import Testimonials from "@/components/home/Testimonials";
import { getInstagramHome } from "@/lib/instagram-home";
import { comparePhotos } from "@/lib/manual-order";
import { SAMPLE_PHOTOS } from "@/lib/package-limits";
import { resolveCategory, sampleAlbumId, type SamplePhotosByPackage } from "@/lib/pricing-rows";

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
  const { docs: categories } = await payload.find({
    collection: "categories",
    where: { published: { equals: true } },
    sort: "_order", // drag order from the admin list (Categories.ts `orderable`)
    depth: 1,
    limit: 0,
  });
  const hero = await payload.findGlobal({ slug: "hero" });
  const about = await payload.findGlobal({ slug: "about" });
  // Quick links to a page with nothing published yet are left out
  // (lib/listing-pages.ts), and to Privacy Policy or Terms while it has no
  // text (lib/legal-pages.ts).
  const emptyPages = [...(await emptyListingPages(payload)), ...(await emptyLegalPages(payload))];
  const categoriesIntro = await payload.findGlobal({ slug: "categories-intro" });
  // Depth 2: the featured package, then its category (for the link and the
  // hidden/trashed check in components/home/FeaturedOffer.tsx).
  const featuredOffer = await payload.findGlobal({ slug: "featured-offer", depth: 2 });
  const { docs: allPricingRows } = await payload.find({
    collection: "pricing-rows",
    where: { published: { equals: true } },
    depth: 1,
    sort: "_order", // drag order from the Packages list (PricingRows.ts `orderable`)
    limit: 0,
  });
  // `category` is required, so a null here means it's in the Trash (Payload
  // populates trashed relations as null); a hidden category's portfolio page
  // 404s. Either way, hide the package rather than show "View gallery" /
  // "Book" links to a category visitors can't open — the same rule as the
  // Featured Offer's package picker (lib/featured-package.ts).
  const pricingRows = allPricingRows.filter((row) => resolveCategory(row.category)?.published);

  // Each package's first few album photos (in the album's own order, as on
  // its category page), for the spotlight. One query for every package's
  // album; photos without a url are skipped. A package with no usable album
  // or photos gets none, and the spotlight leaves the space out entirely.
  const albumIds = [...new Set(pricingRows.map(sampleAlbumId).filter((id) => id !== null))];
  const { docs: unsortedAlbumPhotos } = albumIds.length
    ? await payload.find({
        collection: "photos",
        where: { event: { in: albumIds } },
        depth: 0,
        limit: 0,
      })
    : { docs: [] };
  const albumPhotos = unsortedAlbumPhotos.toSorted(comparePhotos);
  const samplePhotos: SamplePhotosByPackage = {};
  for (const row of pricingRows) {
    const albumId = sampleAlbumId(row);
    if (albumId === null) continue;
    samplePhotos[row.id] = albumPhotos
      .filter((photo) => photo.event === albumId && photo.url)
      .slice(0, SAMPLE_PHOTOS)
      .map((photo) => ({
        id: photo.id,
        url: photo.url as string,
        alt: photo.alt,
        focalX: photo.focalX,
        focalY: photo.focalY,
        width: photo.width,
        height: photo.height,
      }));
  }
  // depth 2: the picked testimonials, then each one's category (for the
  // attribution line).
  const testimonialsTeaser = await payload.findGlobal({
    slug: "testimonials-teaser",
    depth: 2,
  });
  const bookingCta = await payload.findGlobal({ slug: "booking-cta" });
  const siteSettings = await payload.findGlobal({ slug: "site-settings" });
  // The section, connected accounts and their synced posts (lib/instagram-home.ts).
  const instagram = await getInstagramHome(payload);

  return (
    <>
      {/* 1. Hero */}
      <Hero hero={hero} categories={categories} />

      {/* 2. Categories */}
      <Categories categoriesIntro={categoriesIntro} categories={categories} />

      {/* 3. About */}
      <About about={about} hiddenHrefs={emptyPages} />

      {/* 4. Hot offer */}
      <FeaturedOffer featuredOffer={featuredOffer} samplePhotos={samplePhotos} />

      {/* 5. Offers & pricing */}
      <Offers pricingRows={pricingRows} featuredOffer={featuredOffer} />

      {/* 6. General booking CTA */}
      <BookingCta bookingCta={bookingCta} siteSettings={siteSettings} />

      {/* 7. Recent Instagram */}
      <Instagram home={instagram} siteSettings={siteSettings} />

      {/* 8. Testimonials teaser */}
      <Testimonials testimonialsTeaser={testimonialsTeaser} />
    </>
  );
}
