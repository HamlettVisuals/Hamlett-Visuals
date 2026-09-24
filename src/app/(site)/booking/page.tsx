import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import BookingPageContent from "@/components/booking/BookingPageContent";
import { OTHER_SESSION_TYPE } from "@/lib/booking-session-type";

// Booking page. Intro/steps come from the Booking global (see
// globals/Booking.ts); BookingFlow itself is unchanged — a client component
// wrapping the 3-step "how it works" card and the booking form together,
// since the card turns into a progress tracker once the form is submitted
// and needs to share that state with it (see
// src/components/booking/BookingFlow.tsx). UI only: submitting shows the
// success state locally: no Supabase, no email delivery, no API route yet.

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

  return (
    <div
      id="booking"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-gutter py-section"
    >
      <BookingPageContent
        booking={booking}
        categories={categories}
        fallbackCategoryId={fallbackCategoryId}
      />

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
