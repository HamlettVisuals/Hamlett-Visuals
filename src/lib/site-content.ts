// Placeholder site content for the restructured single-page homepage.
// This is structure/routing scaffolding only — real copy, images, and pricing
// come with the design pass. Category slugs here must match the folder slugs
// produced by `slugify()` in `@/lib/albums` so the tiles link to real
// `/portfolio/[category]` pages.

export type Category = {
  slug: string;
  name: string;
  // One-line descriptor shown under the name on the homepage category tile.
  // Purposeful placeholder copy — the real lines come later.
  blurb: string;
  // Representative image for the homepage category tile. Portrait-oriented so
  // it fills the tall tile without heavy cropping.
  // TODO: replace the /categories/*.svg placeholders with one real photo per
  // category once shots are chosen (keep them portrait, e.g. 3:4 – 9:16).
  image: string;
};

export const categories: Category[] = [
  {
    slug: "weddings",
    name: "Weddings",
    blurb: "The whole day, from first look to last dance",
    image: "/categories/weddings.svg",
  },
  {
    slug: "races",
    name: "Races",
    blurb: "From the start gun to the finish-line sprint",
    image: "/categories/races.svg",
  },
  {
    slug: "portraits",
    name: "Portraits",
    blurb: "Honest expressions in natural light",
    image: "/categories/portraits.svg",
  },
  {
    slug: "real-estate-construction",
    name: "Real Estate / Construction",
    blurb: "Finished spaces and work in progress",
    image: "/categories/real-estate-construction.svg",
  },
];

export type Offer = {
  id: string;
  category: string;
  name: string;
  details: string;
  // Placeholder gallery — plain labels for now, swapped for real images later.
  gallery: string[];
  bookHref: string;
};

export const offers: Offer[] = [
  {
    id: "wedding-full-day",
    category: "Weddings",
    name: "Wedding — Full Day Coverage",
    details:
      "Placeholder details for full-day wedding coverage. Hours, deliverables, and pricing go here.",
    gallery: ["Image 1", "Image 2", "Image 3"],
    bookHref: "/booking?offer=wedding-full-day",
  },
  {
    id: "wedding-elopement",
    category: "Weddings",
    name: "Wedding — Elopement",
    details:
      "Placeholder details for a smaller elopement package. Hours, deliverables, and pricing go here.",
    gallery: ["Image 1", "Image 2", "Image 3"],
    bookHref: "/booking?offer=wedding-elopement",
  },
  {
    id: "race-day",
    category: "Races",
    name: "Race Day Coverage",
    details:
      "Placeholder details for race day coverage. Session length, number of edits, and pricing go here.",
    gallery: ["Image 1", "Image 2", "Image 3"],
    bookHref: "/booking?offer=race-day",
  },
  {
    id: "portrait-session",
    category: "Portraits",
    name: "Portrait Session",
    details:
      "Placeholder details for a portrait session. Location, wardrobe changes, and pricing go here.",
    gallery: ["Image 1", "Image 2", "Image 3"],
    bookHref: "/booking?offer=portrait-session",
  },
  {
    id: "property-shoot",
    category: "Real Estate / Construction",
    name: "Property / Site Shoot",
    details:
      "Placeholder details for a real estate or construction shoot. Square footage, drone add-ons, and pricing go here.",
    gallery: ["Image 1", "Image 2", "Image 3"],
    bookHref: "/booking?offer=property-shoot",
  },
];

export type HotOffer = {
  eyebrow: string;
  name: string;
  details: string;
  bookHref: string;
};

export const hotOffer: HotOffer = {
  eyebrow: "Hot offer",
  name: "Placeholder featured promo",
  details:
    "Placeholder copy for the one highlighted promotion. Deadline, discount, and terms go here.",
  bookHref: "/booking?offer=hot-offer",
};

export type InstagramPost = {
  id: string;
  href: string;
  caption: string;
};

export const instagramPosts: InstagramPost[] = [
  { id: "1", href: "https://www.instagram.com/", caption: "Placeholder post 1" },
  { id: "2", href: "https://www.instagram.com/", caption: "Placeholder post 2" },
  { id: "3", href: "https://www.instagram.com/", caption: "Placeholder post 3" },
  { id: "4", href: "https://www.instagram.com/", caption: "Placeholder post 4" },
  { id: "5", href: "https://www.instagram.com/", caption: "Placeholder post 5" },
  { id: "6", href: "https://www.instagram.com/", caption: "Placeholder post 6" },
];

export type Testimonial = {
  quote: string;
  author: string;
};

export const testimonialsTeaser: Testimonial[] = [
  { quote: "Placeholder testimonial quote one.", author: "Client A" },
  { quote: "Placeholder testimonial quote two.", author: "Client B" },
];

// --- Hero filmstrip ------------------------------------------------------------
// The homepage hero is a cross-category filmstrip: it shows exactly ONE
// representative image per category and crossfades between them in the order the
// `categories` array declares (Weddings → Races → Portraits → Real Estate /
// Construction → repeat). Slug, display name and order come straight from
// `categories` so the hero can never drift out of sync with the portfolio; only
// the image path and its alt text are hero-specific and live here.
//
// TODO: swap each placeholder in `/public/hero/*.svg` for a real representative
// photo per category (e.g. `/hero/weddings.jpg`). Keep it to ONE image per
// category, and rewrite each `alt` to describe what that specific photo shows.

export type HeroSlide = {
  categorySlug: string;
  category: string;
  src: string;
  alt: string;
};

const heroImageByCategory: Record<string, { src: string; alt: string }> = {
  weddings: {
    src: "/hero/weddings.svg",
    alt: "A newly married couple sharing their first dance as guests look on.",
  },
  races: {
    src: "/hero/races.svg",
    alt: "Runners rounding the final bend of a road race at full effort.",
  },
  portraits: {
    src: "/hero/portraits.svg",
    alt: "A person in soft window light, caught mid-laugh during a portrait session.",
  },
  "real-estate-construction": {
    src: "/hero/real-estate-construction.svg",
    alt: "A modern house exterior photographed at dusk with the interior lights on.",
  },
};

export const heroSlides: HeroSlide[] = categories.map((category) => {
  const image = heroImageByCategory[category.slug];
  if (!image) {
    throw new Error(
      `No hero image configured for category "${category.slug}". ` +
        "Add an entry to heroImageByCategory in src/lib/site-content.ts.",
    );
  }
  return {
    categorySlug: category.slug,
    category: category.name,
    src: image.src,
    alt: image.alt,
  };
});
