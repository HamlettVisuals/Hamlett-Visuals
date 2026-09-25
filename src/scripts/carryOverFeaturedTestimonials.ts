import { getPayload } from "payload";
import config from "#src/payload.config.ts";
import { AVAILABLE_TESTIMONIAL_WHERE, TESTIMONIAL_PICKS_MAX } from "#src/lib/teaser-testimonials.ts";

// One-time carry-over from the old per-testimonial `featured` checkbox to the
// Testimonials Teaser global's "Testimonials" picks. Takes the checked ones
// the site can show (published, not trashed — the picker's own rule), oldest
// first, up to the picker's limit, and only runs while nothing is picked yet,
// so it can't undo a later choice. Run with
// `payload run src/scripts/carryOverFeaturedTestimonials.ts --disable-transpile`.
async function carryOver() {
  const payload = await getPayload({ config });

  const global = await payload.findGlobal({ slug: "testimonials-teaser", depth: 0 });
  if (global.testimonials?.length) {
    payload.logger.info("[carryOverFeaturedTestimonials] Testimonials are already picked — skipping.");
    await payload.destroy();
    process.exit(0);
  }

  const { docs } = await payload.find({
    collection: "testimonials",
    where: { and: [{ featured: { equals: true } }, AVAILABLE_TESTIMONIAL_WHERE] },
    sort: "createdAt",
    depth: 0,
    limit: TESTIMONIAL_PICKS_MAX,
  });

  if (docs.length === 0) {
    payload.logger.info("[carryOverFeaturedTestimonials] No testimonial has 'featured' checked — nothing to carry over.");
  } else {
    await payload.updateGlobal({
      slug: "testimonials-teaser",
      data: { testimonials: docs.map((doc) => doc.id) },
    });
    payload.logger.info(
      `[carryOverFeaturedTestimonials] Picked ${docs.map((doc) => `"${doc.clientName}"`).join(", ")}.`,
    );
  }

  await payload.destroy();
  process.exit(0);
}

await carryOver();
