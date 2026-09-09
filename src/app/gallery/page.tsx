import Link from "next/link";
import { getAlbums } from "@/lib/albums";

export default function Gallery() {
  const albums = getAlbums();

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Gallery
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Browse by category.
        </p>
      </div>
      {albums.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No albums yet. Add folders to{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
            public/photos
          </code>{" "}
          to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {albums.map((album) => {
            const coverPhoto = album.events.flatMap((event) => event.photos)[0];

            return (
              <Link
                key={album.slug}
                href={`/gallery/${album.slug}`}
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
                    {album.name}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {album.events.length}{" "}
                    {album.events.length === 1 ? "event" : "events"}
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
