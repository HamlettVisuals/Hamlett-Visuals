import { getPayload } from "payload";
import config from "#src/payload.config.ts";

// One-off seed for the two Standard checklist templates (category unset) —
// the fallback used by any category that doesn't have its own Prep/Post-
// Production template. Safe to run more than once: checks for an existing
// template of each type with no category set before creating one. Run with
// `payload run src/scripts/seedStandardChecklistTemplates.ts --use-swc`.
const STANDARD_TEMPLATES = [
  { type: "prep" as const, name: "Standard — Prep" },
  { type: "postProduction" as const, name: "Standard — Post-Production" },
];

async function seed() {
  const payload = await getPayload({ config });

  for (const template of STANDARD_TEMPLATES) {
    const { totalDocs } = await payload.count({
      collection: "checklist-templates",
      where: {
        type: { equals: template.type },
        category: { exists: false },
      },
    });

    if (totalDocs > 0) {
      payload.logger.info(
        `[seed] Standard ${template.type} template already exists — skipping.`,
      );
      continue;
    }

    await payload.create({
      collection: "checklist-templates",
      data: {
        name: template.name,
        type: template.type,
        items: [],
      },
    });
    payload.logger.info(`[seed] Created Standard ${template.type} template.`);
  }

  await payload.destroy();
  process.exit(0);
}

await seed();
