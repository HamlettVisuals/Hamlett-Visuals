import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbums, getAlbumBySlug } from "@/lib/albums";

export function generateStaticParams() {
  return getAlbums().map((album) => ({ album: album.slug }));
}

export default async function AlbumPage({
  params,
}: PageProps<"/gallery/[album]">) {
  const { album: slug } = await params;
  const album = getAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <nav className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/gallery" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Gallery
          </Link>{" "}
          <span aria-hidden="true">›</span> {album.name}
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {album.name}
        </h1>
      </div>
      {album.events.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No events yet in this category.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {album.events.map((event) => {
            const coverPhoto = event.photos[0];

            return (
              <Link
                key={event.slug}
                href={`/gallery/${album.slug}/${event.slug}`}
                className="group flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-md bg-zinc-200 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {coverPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverPhoto.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "No photos yet"
                  )}
                </div>
                <div>
                  <h2 className="font-medium text-zinc-950 dark:text-zinc-50">
                    {event.name}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {event.photos.length}{" "}
                    {event.photos.length === 1 ? "photo" : "photos"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
