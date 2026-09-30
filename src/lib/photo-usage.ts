import type { PayloadRequest } from "payload";
import { comparePhotos } from "#src/lib/manual-order.ts";
import { SAMPLE_PHOTOS } from "#src/lib/package-limits.ts";

// Where else on the site a photo shows, in plain words, for the album
// page's "Delete photo…" warning (Photos' GET /:id/usage). Trashing a photo
// takes it off the site everywhere, so she's told first. Checks every field
// that points at a photo and the site reads: category cover and page
// photos, hero slides, the About portrait, testimonials, the tab icon and
// share image, and a package's sample photos (the first few photos of the
// package's album). Retired, unread fields (the old hero photos, package
// gallery, Backstage thumbnail) are left out.
//
// Part of payload.config.ts's module graph (Photos.ts imports it), so no
// "@/…" imports.

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number }).id : (value as number | null | undefined);

export async function findPhotoUsage(req: PayloadRequest, photoId: number): Promise<string[]> {
  const { payload } = req;
  const common = { depth: 0, pagination: false, req } as const;
  const same = (value: unknown) => idOf(value) === photoId;

  const [photo, categories, testimonials, hero, about, settings] = await Promise.all([
    payload.findByID({ collection: "photos", id: photoId, depth: 0, select: { event: true }, disableErrors: true, req }),
    payload.find({
      collection: "categories",
      where: { or: [{ coverPhoto: { equals: photoId } }, { heroPhoto: { equals: photoId } }] },
      select: { name: true, coverPhoto: true, heroPhoto: true },
      ...common,
    }),
    payload.find({
      collection: "testimonials",
      where: { photo: { equals: photoId } },
      select: { clientName: true },
      ...common,
    }),
    payload.findGlobal({ slug: "hero", depth: 0, req }),
    payload.findGlobal({ slug: "about", depth: 0, req }),
    payload.findGlobal({ slug: "site-settings", depth: 0, req }),
  ]);

  const uses: string[] = [];
  for (const category of categories.docs) {
    if (same(category.coverPhoto)) uses.push(`the cover of the "${category.name}" category`);
    if (same(category.heroPhoto)) uses.push(`the top of the "${category.name}" category page`);
  }
  const slides = (hero.slides ?? []).filter((slide) => same(slide.photo) || same(slide.mobilePhoto));
  if (slides.length) uses.push(slides.length === 1 ? "a homepage hero slide" : `${slides.length} homepage hero slides`);
  if (same(about.portrait)) uses.push("your About photo");
  for (const testimonial of testimonials.docs) uses.push(`the testimonial from ${testimonial.clientName}`);
  if (same(settings.favicon)) uses.push("your site's tab icon");
  if (same(settings.ogImage)) uses.push("your site's share image");

  // A package's samples are its album's first photos, in her order.
  const albumId = idOf(photo?.event);
  if (albumId != null) {
    const [packages, albumPhotos] = await Promise.all([
      payload.find({
        collection: "pricing-rows",
        where: { album: { equals: albumId } },
        select: { title: true },
        ...common,
      }),
      payload.find({
        collection: "photos",
        where: { event: { equals: albumId } },
        select: { url: true, albumOrder: true, createdAt: true },
        ...common,
      }),
    ]);
    const samples = albumPhotos.docs
      .filter((doc) => doc.url)
      .toSorted(comparePhotos)
      .slice(0, SAMPLE_PHOTOS);
    if (samples.some((doc) => doc.id === photoId)) {
      for (const pkg of packages.docs) uses.push(`a sample photo for the "${pkg.title}" package`);
    }
  }

  return uses;
}
