import { getPayload } from "payload";
import config from "#src/payload.config.ts";

// One-time carry-over from the old per-row `featured` checkbox on Packages
// (pricing-rows) to the Featured Offer global's "Featured package" field. Picks
// the row that's checked (the first in the list's order if more than one was), and only
// runs while the global has nothing picked, so it can't undo a later choice.
// Trashed rows are skipped, like the dropdown skips them. Run with
// `payload run src/scripts/carryOverFeaturedPackage.ts --disable-transpile`.
async function carryOver() {
  const payload = await getPayload({ config });

  const global = await payload.findGlobal({ slug: "featured-offer", depth: 0 });
  if (global.featuredPackage) {
    payload.logger.info("[carryOverFeaturedPackage] A featured package is already picked — skipping.");
    await payload.destroy();
    process.exit(0);
  }

  const { docs } = await payload.find({
    collection: "pricing-rows",
    where: { featured: { equals: true } },
    sort: ["_order", "order", "createdAt"],
    depth: 0,
    limit: 1,
  });

  if (!docs[0]) {
    payload.logger.info("[carryOverFeaturedPackage] No row has 'featured' checked — nothing to carry over.");
  } else {
    await payload.updateGlobal({
      slug: "featured-offer",
      data: { featuredPackage: docs[0].id },
    });
    payload.logger.info(`[carryOverFeaturedPackage] Featured package set to "${docs[0].title}".`);
  }

  await payload.destroy();
  process.exit(0);
}

await carryOver();
