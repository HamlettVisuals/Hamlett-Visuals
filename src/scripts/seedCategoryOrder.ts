import { getPayload } from "payload";
import { generateNKeysBetween } from "payload/shared";
import config from "#src/payload.config.ts";
import { OTHER_SESSION_TYPE } from "#src/lib/booking-session-type.ts";

// One-time carry-over from the old numeric `order` field to the drag-order
// key (`_order`) that Categories.ts's `orderable: true` adds. Keeps the
// existing order (lowest `order` first, ties by creation), with "Other"
// pinned last. Only runs while some category still has no key, so it can't
// undo a later drag-reorder. Run with
// `payload run src/scripts/seedCategoryOrder.ts --disable-transpile`.
async function seed() {
  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "categories",
    trash: true,
    depth: 0,
    limit: 0,
    sort: ["order", "createdAt"],
  });

  if (docs.every((doc) => doc._order)) {
    payload.logger.info("[seedCategoryOrder] Every category already has an order key — skipping.");
    await payload.destroy();
    process.exit(0);
  }

  const ordered = [
    ...docs.filter((doc) => doc.slug !== OTHER_SESSION_TYPE),
    ...docs.filter((doc) => doc.slug === OTHER_SESSION_TYPE),
  ];
  const keys = generateNKeysBetween(null, null, ordered.length);

  for (const [i, doc] of ordered.entries()) {
    await payload.update({
      collection: "categories",
      id: doc.id,
      data: { _order: keys[i] },
      trash: true,
      depth: 0,
      context: { allowOrderChange: true },
    });
    payload.logger.info(`[seedCategoryOrder] ${keys[i]}  ${doc.name}`);
  }

  await payload.destroy();
  process.exit(0);
}

await seed();
