// Placeholder site content for the restructured single-page homepage.
// This is structure/routing scaffolding only — real copy, images, and pricing
// come with the design pass. Category slugs here must match the folder slugs
// produced by `slugify()` in `@/lib/albums` so the tiles link to real
// `/portfolio/[category]` pages.

export type Category = {
  slug: string;
  name: string;
  blurb: string;
};

export const categories: Category[] = [
  {
    slug: "weddings",
    name: "Weddings",
    blurb: "Placeholder blurb for the weddings category.",
  },
  {
    slug: "races",
    name: "Races",
    blurb: "Placeholder blurb for the races category.",
  },
  {
    slug: "portraits",
    name: "Portraits",
    blurb: "Placeholder blurb for the portraits category.",
  },
  {
    slug: "real-estate-construction",
    name: "Real Estate / Construction",
    blurb: "Placeholder blurb for the real estate and construction category.",
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

// Rotating hero images — placeholder array. Uses existing files in /public so
// they resolve; real hero images replace these in the design pass.
export const heroImages: string[] = [
  "/window.svg",
  "/globe.svg",
  "/file.svg",
];
