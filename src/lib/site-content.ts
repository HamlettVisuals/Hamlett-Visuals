// Placeholder site content for the restructured single-page homepage.
// This is structure/routing scaffolding only — real copy, images, and pricing
// come with the design pass. Category slugs here must match a real Categories
// collection slug (Payload's formatSlug hook) so the tiles link to real
// `/portfolio/[category]` pages.

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
