import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug } from "@/lib/categories";
import { getEventsForCategoryFolder } from "@/lib/albums";
import CategoryGallery from "@/components/Gallery/CategoryGallery";
import GalleryEmptyState from "@/components/Gallery/GalleryEmptyState";

// Category landing page. Wired to the existing folder-scan logic in
// `@/lib/albums` — `[category]` maps to a top-level folder under public/photos.

export function generateStaticParams() {
  return getCategories().map((category) => ({ category: category.slug }));
}

export default async function CategoryPage({
  params,
}: PageProps<"/portfolio/[category]">) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const events = getEventsForCategoryFolder(category.folderName);

  return (
    // w-full is load-bearing, not cosmetic: without it, `main`'s flex stretch
    // fails to size this container once anything inside it (e.g. PhotoGrid's
    // CSS grid) is a `display: grid` descendant, collapsing the whole column
    // to that grid's intrinsic width instead of filling the page.
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-gutter py-section">
      <div>
        <nav className="mb-2 text-caption text-muted">
          <Link href="/#categories" className="link text-ink">
            Portfolio
          </Link>{" "}
          <span aria-hidden="true">›</span> {category.name}
        </nav>
        <h1 className="font-display text-page text-ink">{category.name}</h1>
      </div>

      {events.length === 0 ? (
        <GalleryEmptyState />
      ) : (
        <CategoryGallery category={category} events={events} />
      )}
    </div>
  );
}
