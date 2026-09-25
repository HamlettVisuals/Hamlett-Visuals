import { getPayload } from "payload";
import { generateNKeysBetween } from "payload/shared";
import config from "#src/payload.config.ts";

// One-time carry-over for Packages (pricing-rows) from the old numeric
// `order` field to the drag-order key (`_order`) that PricingRows.ts's
// `orderable: true` adds. Keeps the existing order (lowest `order` first,
// ties by creation). Only runs while some package still has no key, so it
// can't undo a later drag-reorder. Also switches "Show on website" on for
// any package from before that switch existed. Run with
// `payload run src/scripts/seedPackageOrder.ts --disable-transpile`.
async function seed() {
  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "pricing-rows",
    trash: true,
    depth: 0,
    limit: 0,
    sort: ["order", "createdAt"],
  });

  if (docs.every((doc) => doc._order && typeof doc.published === "boolean")) {
    payload.logger.info("[seedPackageOrder] Every package already has an order key and a show/hide setting — skipping.");
    await payload.destroy();
    process.exit(0);
  }

  const keys = docs.every((doc) => doc._order) ? null : generateNKeysBetween(null, null, docs.length);

  for (const [i, doc] of docs.entries()) {
    await payload.update({
      collection: "pricing-rows",
      id: doc.id,
      data: {
        ...(keys ? { _order: keys[i] } : {}),
        ...(typeof doc.published === "boolean" ? {} : { published: true }),
      },
      trash: true,
      depth: 0,
      context: { allowOrderChange: true },
    });
    payload.logger.info(`[seedPackageOrder] ${keys?.[i] ?? doc._order}  ${doc.title}`);
  }

  await payload.destroy();
  process.exit(0);
}

await seed();
