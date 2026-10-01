import type { Payload, Where } from "payload";

// Pages that only list a collection's published items, and so are empty
// until something is published there. The About section's quick links
// (components/home/About.tsx) leave out a card that goes to one of these
// while it's empty, and show it again by themselves once it isn't: every
// save in those collections refreshes the site (lib/revalidate-site.ts). The
// About editor says so on the link (components/admin/AboutQuickLinksField.tsx).
//
// `where` is what the page itself shows: published Backstage items
// (app/(site)/backstage/page.tsx); published testimonials that have a
// category, since the Testimonials page groups by category and leaves out
// any without one (app/(site)/testimonials/page.tsx).
export const LISTING_PAGES: Record<string, { collection: "backstage" | "testimonials"; name: string; where: Where }> = {
  "/backstage": {
    collection: "backstage",
    name: "Backstage",
    where: { published: { equals: true } },
  },
  "/testimonials": {
    collection: "testimonials",
    name: "Testimonials",
    where: { and: [{ published: { equals: true } }, { category: { exists: true } }] },
  },
};

/** The listing pages with nothing on them yet, by href. */
export async function emptyListingPages(payload: Payload): Promise<string[]> {
  const counts = await Promise.all(
    Object.entries(LISTING_PAGES).map(async ([href, page]) => {
      const { totalDocs } = await payload.count({ collection: page.collection, where: page.where });
      return totalDocs === 0 ? href : null;
    }),
  );
  return counts.filter((href): href is string => href !== null);
}
