// Placeholder site content for the restructured single-page homepage.
// This is structure/routing scaffolding only — real copy, images, and pricing
// come with the design pass. Category slugs here must match the folder slugs
// produced by `slugify()` in `@/lib/albums` so the tiles link to real
// `/portfolio/[category]` pages.

import { getCategories } from "@/lib/categories";

export type Offer = {
  id: string;
  // Display name + slug of the category this offer belongs to. `categorySlug`
  // must match a `categories` entry so the "View <category> work" link resolves
  // to a real /portfolio/[category] page.
  category: string;
  categorySlug: string;
  title: string;
  // Placeholder price. `lead` is the small caption above the figure ("From"),
  // `amount` the figure itself — split so the row can size the two
  // differently without parsing a string.
  price: { lead: string; amount: string };
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
    price: { lead: "From", amount: "$2,800" },
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
    price: { lead: "From", amount: "$350" },
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
    price: { lead: "From", amount: "$300" },
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
    title: "Brand & Product Shoot",
    price: { lead: "From", amount: "$600 / half day" },
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
    price: { lead: "From", amount: "$500" },
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
    price: { lead: "From", amount: "$250" },
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

// `featuredOffer` drives the standalone Hot offer section. `standardOffers` is
// the Offers & pricing list — every offer, in category order, INCLUDING the
// featured one (its row just renders with the badge / accent border / accent
// title + price). Flip the `featured` flag to another entry and both sections
// follow, no component change.
export const featuredOffer: Offer =
  offers.find((offer) => offer.featured) ?? offers[0];

export const standardOffers: Offer[] = offers;

// Single source of truth for the studio's Instagram identity. Imported by the
// Footer, the Booking CTA and the homepage Instagram section — change the
// handle or URL here and every reference follows.
export const instagram = {
  handle: "@hamlettvisuals",
  url: "https://www.instagram.com/hamlettvisuals/",
};

export type InstagramPost = {
  // Stable key for the React list. Becomes the Graph API media id under a real
  // sync.
  id: string;
  // Square (1:1) thumbnail. A real sync supplies `media_url` / `thumbnail_url`.
  image: string;
  // Describes the photo for screen readers; not shown on the page.
  alt: string;
  // Link to the post itself. Placeholder points at the profile for now; a real
  // sync supplies the per-post `permalink`.
  permalink: string;
  // Optional text under the tile — only some posts carry it, so the grid is
  // not captioned wall-to-wall. `subcaption` is the smaller second line.
  caption?: string;
  subcaption?: string;
  // Optional curation link: when a post is about a specific offer or category,
  // the caption line links to that portfolio page. `relatedOfferId` matches an
  // `offers` entry id; `relatedCategorySlug` matches a `categories` slug. Only
  // takes effect when the post also has a `caption` to attach the link to.
  relatedOfferId?: string;
  relatedCategorySlug?: string;
};

// Nine hand-picked posts. The count is fixed at 9 (a 3×3 grid) — this is NOT a
// live feed.
//
// TODO (backend/admin phase): showing the *actual* most-recent posts needs an
// Instagram Graph API integration — a Business or Creator account linked to a
// Facebook Page, a long-lived access token refreshed on a schedule, and a
// server-side fetch that caches the response (the token must never reach the
// client). That's out of scope for the design pass; this curated list stands in
// until then, and the entry shape above deliberately mirrors a Graph API media
// object so the swap is a data-source change, not a redesign.
export const instagramPosts: InstagramPost[] = [
  {
    id: "1",
    image: "/instagram/post-1.svg",
    alt: "A couple's first dance under warm string lights while guests look on.",
    permalink: instagram.url,
    caption: "Golden-hour first dance",
    subcaption: "Riverside barn, September",
    relatedCategorySlug: "weddings",
  },
  {
    id: "2",
    image: "/instagram/post-2.svg",
    alt: "A portrait in soft window light, caught mid-laugh.",
    permalink: instagram.url,
  },
  {
    id: "3",
    image: "/instagram/post-3.svg",
    alt: "A race car in the pit lane during a mid-season round.",
    permalink: instagram.url,
    caption: "Pit lane, round four",
    relatedCategorySlug: "motorsports",
  },
  {
    id: "4",
    image: "/instagram/post-4.svg",
    alt: "A dog mid-stride across an open field, ears up.",
    permalink: instagram.url,
  },
  {
    id: "5",
    image: "/instagram/post-5.svg",
    alt: "A styled studio set for a coffee roaster's product shoot.",
    permalink: instagram.url,
    caption: "Studio set for a coffee roaster",
    subcaption: "Product day",
    relatedOfferId: "brands",
  },
  {
    id: "6",
    image: "/instagram/post-6.svg",
    alt: "A modern house exterior photographed at dusk with the interior lights on.",
    permalink: instagram.url,
    caption: "Twilight exterior",
    subcaption: "Listing shoot",
    relatedCategorySlug: "real-estate",
  },
  {
    id: "7",
    image: "/instagram/post-7.svg",
    alt: "An outdoor portrait backlit by late-afternoon sun.",
    permalink: instagram.url,
  },
  {
    id: "8",
    image: "/instagram/post-8.svg",
    alt: "Getting-ready details before a wedding: rings, invitation, and flowers laid out.",
    permalink: instagram.url,
    caption: "Getting-ready details",
  },
  {
    id: "9",
    image: "/instagram/post-9.svg",
    alt: "Two dogs running a trail with their owner on a bright morning.",
    permalink: instagram.url,
    caption: "Trail run with the dogs",
    relatedCategorySlug: "pets",
  },
];

export type Testimonial = {
  quote: string;
  clientName: string;
  // Which of the six categories this testimonial relates to — must match a
  // `categories` slug so the homepage tag and the /testimonials grouping stay
  // in step with the portfolio.
  categorySlug: string;
  // Optional short context line, e.g. "Wedding, June 2025". Placeholder.
  context?: string;
  // The homepage teaser shows exactly the entries flagged here — flip the flag
  // rather than hardcoding names in the component (same pattern as `offers`).
  featured?: boolean;
};

// TODO: every quote below is placeholder, written to set tone and length —
// swap in her real client testimonials before launch. Keep each `categorySlug`
// pointing at a real category, and keep exactly two entries `featured` for the
// homepage teaser.
export const testimonials: Testimonial[] = [
  {
    quote:
      "We keep going back to the photos from the quiet parts of the day — my grandmother laughing, my husband's face just before the ceremony. She gave us the day we actually had, not a tidied-up version of it.",
    clientName: "Priya & Daniel",
    categorySlug: "weddings",
    context: "Wedding, June 2025",
    featured: true,
  },
  {
    quote:
      "She was somehow everywhere and nowhere all day. We barely noticed the camera, and then the gallery came back and every face that mattered to us was in it.",
    clientName: "The Alvarez family",
    categorySlug: "weddings",
    context: "Wedding, September 2024",
  },
  {
    quote:
      "I told her up front that I hate having my picture taken. An hour later I had thirty photos I actually liked and a headshot I still use everywhere.",
    clientName: "Marcus Bell",
    categorySlug: "portraits",
    context: "Personal branding session",
  },
  {
    quote:
      "Our first proper family portraits since the kids were born. Nobody is looking at the camera in my favourite one, and that is exactly why I love it.",
    clientName: "Hannah Okafor",
    categorySlug: "portraits",
    context: "Family session, Spring 2025",
  },
  {
    quote:
      "Apparently a good photo of a black dog is hard to get. You would not know it from our gallery — you can see every bit of his face.",
    clientName: "Sam Reyes",
    categorySlug: "pets",
    context: "Pet session, at home",
  },
  {
    quote:
      "She sat on our kitchen floor for twenty minutes waiting for the cat to do something worth photographing. The wait was worth it.",
    clientName: "Deborah Lin",
    categorySlug: "pets",
  },
  {
    quote:
      "We handed over a rough shot list and got back images already cropped for every place we needed them. The launch went out a week early because the photos were ready first.",
    clientName: "Off-Grid Coffee Roasters",
    categorySlug: "brands",
    context: "Product shoot",
  },
  {
    quote:
      "Clean, consistent, and on brand. We have run the same set across the site and three seasons of ads without it ever looking tired.",
    clientName: "Lena Fischer, Marketing Lead",
    categorySlug: "brands",
    context: "Brand shoot, 2024",
  },
  {
    quote:
      "Trackside all weekend, and the full set was in our inbox the next morning. Half of them ran in the team recap before we had left the paddock.",
    clientName: "Redline Racing",
    categorySlug: "motorsports",
    context: "Race weekend coverage",
    featured: true,
  },
  {
    quote:
      "The twilight exterior sold the listing before the open house. Buyers kept bringing up the photos.",
    clientName: "Compass & Key Realty",
    categorySlug: "real-estate",
    context: "Listing shoot",
  },
];

// The homepage teaser set. Two entries, flagged in `testimonials` above.
export const featuredTestimonials: Testimonial[] = testimonials.filter(
  (testimonial) => testimonial.featured,
);

// --- Hero filmstrip ------------------------------------------------------------
// The homepage hero is a cross-category filmstrip: it shows exactly ONE
// representative image per category and crossfades between them in category
// `order`. Slug, display name, order, and the hero image/alt all come from
// `@/lib/categories` so the hero can never drift out of sync with the
// portfolio.

export type HeroSlide = {
  categorySlug: string;
  category: string;
  src: string;
  alt: string;
};

export function getHeroSlides(): HeroSlide[] {
  return getCategories().map((category) => ({
    categorySlug: category.slug,
    category: category.name,
    src: category.heroImage,
    alt: category.heroAlt,
  }));
}
