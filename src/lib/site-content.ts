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
    slug: "portraits",
    name: "Portraits",
    blurb: "Honest expressions in natural light",
    image: "/categories/portraits.svg",
  },
  {
    slug: "pets",
    name: "Pets",
    blurb: "Fur, feathers, and full personality",
    image: "/categories/pets.svg",
  },
  {
    slug: "brands",
    name: "Brands",
    blurb: "Product and brand photography, shot to sell",
    image: "/categories/brands.svg",
  },
  {
    slug: "motorsports",
    name: "Motorsports",
    blurb: "From the formation lap to the checkered flag",
    image: "/categories/motorsports.svg",
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    blurb: "Finished spaces and work in progress",
    image: "/categories/real-estate.svg",
  },
];

export type Offer = {
  id: string;
  // Display name + slug of the category this offer belongs to. `categorySlug`
  // must match a `categories` entry so the "View <category> work" link resolves
  // to a real /portfolio/[category] page.
  category: string;
  categorySlug: string;
  title: string;
  // Placeholder price string — shown as-is. Keep the "From $…" shape so the
  // number can be swapped without touching layout.
  price: string;
  // One-line highlight shown under the title (and as the hot-offer highlight).
  summary: string;
  // Inclusions list. Revealed behind "Show details" on the regular rows;
  // always visible in the hot-offer block.
  features: string[];
  // Mini-gallery — plain labels for now, rendered as hairline placeholder
  // frames. Becomes an array of image paths once shots are chosen.
  gallery: string[];
  // Exactly one offer sets this. It drives the Hot offer section; flipping it
  // to another entry is all that's needed to promote a different offer —
  // `featuredOffer` / `standardOffers` below do the rest, no component change.
  featured?: boolean;
};

// One offer per category, in the same order as `categories`. The first entry
// (Weddings) is the featured one.
// TODO: every price and feature list here is placeholder — real numbers,
// inclusions and package names are pending from her.
export const offers: Offer[] = [
  {
    id: "weddings",
    category: "Weddings",
    categorySlug: "weddings",
    title: "Wedding Day Coverage",
    price: "From $2,800",
    summary:
      "Full-day coverage from getting ready to the last song, with a second shooter for the ceremony.",
    features: [
      "Up to 10 hours of coverage on the day",
      "Second shooter through the ceremony",
      "Online gallery of 600+ edited images",
      "Sneak-peek set within 48 hours",
      "Print release for personal use",
    ],
    gallery: ["Getting ready", "Ceremony", "First dance"],
    featured: true,
  },
  {
    id: "portraits",
    category: "Portraits",
    categorySlug: "portraits",
    title: "Portrait Session",
    price: "From $350",
    summary:
      "An hour on location for headshots, families, couples, or a personal-branding refresh.",
    features: [
      "One hour at a single location",
      "Two outfit or setup changes",
      "25+ edited images in an online gallery",
      "Print release for personal use",
    ],
    gallery: ["Natural light", "On location", "Close-up"],
  },
  {
    id: "pets",
    category: "Pets",
    categorySlug: "pets",
    title: "Pet Session",
    price: "From $300",
    summary:
      "A relaxed shoot at home or on a favourite walk — treats, breaks, and patience included.",
    features: [
      "Up to 90 minutes, at home or outdoors",
      "20+ edited images in an online gallery",
      "Owners welcome in frame",
      "Print release for personal use",
    ],
    gallery: ["At home", "On the trail", "Portrait"],
  },
  {
    id: "brands",
    category: "Brands",
    categorySlug: "brands",
    title: "Brand & Product Shoot",
    price: "From $600 / half day",
    summary:
      "Product and lifestyle images shot to an agreed shot list, cropped for web and social.",
    features: [
      "Half or full day of shooting",
      "Shot list planned before the day",
      "40+ edited images per half day",
      "Web and social crops of every hero shot",
      "Commercial usage license",
    ],
    gallery: ["Product", "Lifestyle", "Detail"],
  },
  {
    id: "motorsports",
    category: "Motorsports",
    categorySlug: "motorsports",
    title: "Race Day Coverage",
    price: "From $500",
    summary:
      "Trackside coverage of practice, qualifying, and the race, turned around fast.",
    features: [
      "Half or full race day",
      "Trackside and paddock, access permitting",
      "50+ edited images in an online gallery",
      "Next-day delivery of the full set",
      "Social-ready crops included",
    ],
    gallery: ["On track", "Paddock", "Podium"],
  },
  {
    id: "real-estate",
    category: "Real Estate",
    categorySlug: "real-estate",
    title: "Property Shoot",
    price: "From $250",
    summary:
      "Interiors and exteriors for a listing or a portfolio, with twilight and drone as add-ons.",
    features: [
      "Up to 2,500 sq ft (larger on request)",
      "Interiors and exteriors",
      "25+ edited images, next-day delivery",
      "Twilight and drone add-ons",
    ],
    gallery: ["Interior", "Exterior", "Twilight"],
  },
];

// The single promoted offer (Hot offer section) and everything else (the
// Offers & pricing rows). The featured category is deliberately NOT repeated
// in the rows below. Both derive from the `featured` flag above.
export const featuredOffer: Offer =
  offers.find((offer) => offer.featured) ?? offers[0];

export const standardOffers: Offer[] = offers.filter(
  (offer) => offer !== featuredOffer,
);

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
// `categories` array declares (Weddings → Portraits → Pets → Brands →
// Motorsports → Real Estate → repeat). Slug, display name and order come
// straight from `categories` so the hero can never drift out of sync with the
// portfolio; only the image path and its alt text are hero-specific and live
// here.
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
  portraits: {
    src: "/hero/portraits.svg",
    alt: "A person in soft window light, caught mid-laugh during a portrait session.",
  },
  pets: {
    src: "/hero/pets.svg",
    alt: "A dog mid-stride across an open field, ears up and tongue out.",
  },
  brands: {
    src: "/hero/brands.svg",
    alt: "A product styled on a clean set under controlled studio lighting.",
  },
  motorsports: {
    src: "/hero/motorsports.svg",
    alt: "A race car rounding the final corner of the circuit at full throttle.",
  },
  "real-estate": {
    src: "/hero/real-estate.svg",
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
