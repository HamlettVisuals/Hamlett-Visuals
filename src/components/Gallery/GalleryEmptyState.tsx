type GalleryEmptyStateProps = {
  message?: string;
};

/**
 * Shown wherever a category/event page would otherwise render a photo grid
 * with zero items — no events yet, an event with no photos, or (once real
 * fetching exists) a fetch that resolved to an empty array.
 */
export default function GalleryEmptyState({
  message = "No photos yet — check back soon.",
}: GalleryEmptyStateProps) {
  return (
    <p className="py-16 text-center text-body text-accent-text" role="status">
      {message}
    </p>
  );
}
