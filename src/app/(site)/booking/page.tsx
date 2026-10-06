import { getPayload } from "payload";
import config from "@payload-config";
import BookingPageContent from "@/components/booking/BookingPageContent";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";

// Booking page. Its words come from the Booking Page global
// (globals/Booking.ts); BookingFlow (src/components/booking/BookingFlow.tsx)
// holds the "How it works" box and the form, and swaps both for the
// thank-you once a request is sent (a real Inquiry, POST /api/inquiries).

export const metadata = {
  title: "Book a session — Hamlett Visuals",
};

export default async function BookingPage() {
  const payload = await getPayload({ config });
  const booking = await payload.findGlobal({ slug: "booking" });
  // Same query/sort as the homepage's category grid (src/app/(site)/page.tsx)
  // — one source of truth for "session type" options instead of the old
  // src/content/categories.json placeholder, which never reflected real
  // edits made in the CMS.
  const { docs: categories } = await payload.find({
    collection: "categories",
    where: { published: { equals: true } },
    sort: "_order",
    limit: 0,
  });

  // The "Something else" option's fallback Category — deliberately looked
  // up unfiltered by `published`, since it's an internal bucket for
  // BookingForm to point unmapped session types at, not a real homepage
  // tile. Slug, not name, so it still resolves if she renames the record
  // later (see formatSlug.ts: the slug itself is set once, on first save,
  // and never changes after). Undefined here just means it hasn't been
  // created in the admin yet — BookingForm surfaces that as a normal
  // validation error on submit rather than silently dropping the category.
  const { docs: fallbackCategoryDocs } = await payload.find({
    collection: "categories",
    where: { slug: { equals: OTHER_SESSION_TYPE } },
    limit: 1,
  });
  const fallbackCategoryId = fallbackCategoryDocs[0]?.id;

  // Categories with at least one album on show, for the thank-you's "browse
  // the … gallery" link (left out for a category with nothing to browse).
  const { docs: albums } = categories.length
    ? await payload.find({
        collection: "events",
        where: { and: [{ published: { equals: true } }, { category: { in: categories.map((c) => c.id) } }] },
        depth: 0,
        limit: 0,
        select: { category: true },
      })
    : { docs: [] };
  const browsableSlugs = [
    ...new Set(
      albums
        .map((album) => (typeof album.category === "object" ? album.category?.id : album.category))
        .map((id) => categories.find((c) => c.id === id)?.slug)
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ];

  return (
    <div
      id="booking"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-gutter py-section"
    >
      <BookingPageContent
        booking={booking}
        categories={categories}
        fallbackCategoryId={fallbackCategoryId}
        browsableSlugs={browsableSlugs}
      />
    </div>
  );
}
