import { getPayload } from "payload";
import config from "#src/payload.config.ts";

// One-time fix for categories that predate Categories.ts's
// createBlankChecklistTemplates afterChange hook (Chunk 1) — anything
// created before that hook existed has no Prep/Post-Production template of
// its own at all. Fills in whichever of the two is missing, same shape the
// hook produces. Safe to run more than once: checks for an existing
// template of each type before creating one, same idempotency as
// seedStandardChecklistTemplates.ts. Run with
// `payload run src/scripts/backfillChecklistTemplates.ts --disable-transpile`.
const TYPES = [
  { type: "prep" as const, suffix: "Prep" },
  { type: "postProduction" as const, suffix: "Post-Production" },
];

async function backfill() {
  const payload = await getPayload({ config });

  const { docs: categories } = await payload.find({
    collection: "categories",
    limit: 0,
  });

  for (const category of categories) {
    for (const { type, suffix } of TYPES) {
      const { totalDocs } = await payload.count({
        collection: "checklist-templates",
        where: {
          type: { equals: type },
          category: { equals: category.id },
        },
      });

      if (totalDocs > 0) {
        payload.logger.info(`[backfill] "${category.name}" already has a ${type} template — skipping.`);
        continue;
      }

      await payload.create({
        collection: "checklist-templates",
        data: {
          name: `${category.name} — ${suffix}`,
          type,
          category: category.id,
          items: [],
        },
      });
      payload.logger.info(`[backfill] Created ${type} template for "${category.name}".`);
    }
  }

  await payload.destroy();
  process.exit(0);
}

await backfill();
