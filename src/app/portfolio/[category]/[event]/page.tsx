import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbums, getAlbumBySlug, getEventBySlug } from "@/lib/albums";
import PhotoGrid from "@/components/Gallery/PhotoGrid";

// Individual event / shoot gallery page. Reuses the existing folder-scan logic
// (`@/lib/albums`) and the existing <PhotoGrid> + <Lightbox> components — the
// photo data layer is unchanged, only the route around it moved to /portfolio.

export function generateStaticParams() {
  return getAlbums().flatMap((album) =>
    album.events.map((event) => ({
      category: album.slug,
      event: event.slug,
    })),
  );
}

export default async function EventPage({
  params,
}: PageProps<"/portfolio/[category]/[event]">) {
  const { category: categorySlug, event: eventSlug } = await params;
  const album = getAlbumBySlug(categorySlug);
  const event = getEventBySlug(categorySlug, eventSlug);

  if (!album || !event) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <nav className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/#categories" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Portfolio
          </Link>{" "}
          <span aria-hidden="true">›</span>{" "}
          <Link
            href={`/portfolio/${album.slug}`}
            className="hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            {album.name}
          </Link>{" "}
          <span aria-hidden="true">›</span> {event.name}
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {event.name}
        </h1>
      </div>

      {event.photos.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No photos yet in this event.
        </p>
      ) : (
        <PhotoGrid photos={event.photos} eventName={event.name} />
      )}
    </div>
  );
}
