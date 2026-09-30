import type { PayloadRequest } from "payload";
import { generateKeyBetween, generateNKeysBetween } from "payload/shared";

// Saves a drag within one group: albums within a category (Events'
// /reorder-albums endpoint), and photos within an album later. The client
// sends the group's ids in their new order plus the one that moved.
//
// Normally only the moved item gets a new key, between its new neighbours.
// If any item in the group has no key yet (saved by older code) or the keys
// aren't in order, the whole group is renumbered in the order she just set.
// Each change is a normal Payload save with context.allowOrderChange, the
// only way the collections' order hooks let a key change, so the site
// refreshes as for any save (the same way Payload's own /reorder works).
//
// Part of payload.config.ts's module graph (collections import it), so no
// "@/…" imports.

type OrderedCollection = "events" | "photos";

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export async function reorderWithin({
  req,
  collection,
  scopeField,
  scopeId,
  order,
  moved,
}: {
  req: PayloadRequest;
  collection: OrderedCollection;
  scopeField: "category" | "event";
  scopeId: number;
  order: number[];
  moved: number;
}): Promise<Response> {
  if (!req.user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { docs } = await req.payload.find({
    collection,
    where: { [scopeField]: { equals: scopeId } },
    select: { albumOrder: true },
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  });
  const keyById = new Map(docs.map((doc) => [doc.id, (doc as { albumOrder?: string | null }).albumOrder ?? null]));

  // The page's list has to match what's saved, or the new order would be
  // applied to a list she isn't looking at.
  const sameItems = order.length === keyById.size && order.every((id) => keyById.has(id)) && new Set(order).size === order.length;
  if (!sameItems || !keyById.has(moved)) {
    return Response.json({ error: "This list changed somewhere else. Reload the page and try again." }, { status: 409 });
  }

  const others = order.filter((id) => id !== moved).map((id) => keyById.get(id));
  const allKeyed = others.every((key): key is string => Boolean(key));
  const inOrder = allKeyed && others.every((key, i) => i === 0 || compare(others[i - 1] as string, key as string) < 0);

  const updates = new Map<number, string>();
  if (inOrder) {
    const index = order.indexOf(moved);
    const before = index > 0 ? keyById.get(order[index - 1]) ?? null : null;
    const after = index < order.length - 1 ? keyById.get(order[index + 1]) ?? null : null;
    updates.set(moved, generateKeyBetween(before, after));
  } else {
    const keys = generateNKeysBetween(null, null, order.length);
    order.forEach((id, i) => {
      if (keyById.get(id) !== keys[i]) updates.set(id, keys[i]);
    });
  }

  for (const [id, albumOrder] of updates) {
    await req.payload.update({
      collection,
      id,
      data: { albumOrder },
      context: { allowOrderChange: true },
      depth: 0,
      overrideAccess: false,
      user: req.user,
      req,
    });
  }

  return Response.json({ updated: updates.size });
}
