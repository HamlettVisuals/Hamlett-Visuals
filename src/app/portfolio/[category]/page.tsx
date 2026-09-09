import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbums, getAlbumBySlug } from "@/lib/albums";

// Category landing page. Wired to the existing folder-scan logic in
// `@/lib/albums` — `[category]` maps to a top-level folder under public/photos.
// Structure/routing only; the design pass handles layout.

export function generateStaticParams() {
  return getAlbums().map((album) => ({ category: album.slug }));
}

export default async function CategoryPage({
  params,
}: PageProps<"/portfolio/[category]">) {
  const { category: slug } = await params;
  const album = getAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <nav className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/#categories" className="hover:text-zinc-950 dark:hover:text-zinc-50">
            Portfolio
          </Link>{" "}
          <span aria-hidden="true">›</span> {album.name}
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {album.name}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Placeholder category description.
        </p>
      </div>

      {album.events.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No events yet in this category. Add folders under{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
            public/photos/{album.folderName}
          </code>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {album.events.map((event) => (
            <li key={event.slug}>
              <Link
                href={`/portfolio/${album.slug}/${event.slug}`}
                className="underline"
              >
                {event.name}
              </Link>{" "}
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                ({event.photos.length}{" "}
                {event.photos.length === 1 ? "photo" : "photos"})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
