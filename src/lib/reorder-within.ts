import type { PayloadRequest } from "payload";
import { generateKeyBetween, generateNKeysBetween } from "payload/shared";
import { revalidateSite } from "#src/lib/revalidate-site.ts";

// Saves a drag on the Categories & Albums page: categories (Categories'
// /reorder-categories endpoint), albums within a category (Events'
// /reorder-albums), and photos within an album (Photos' /reorder-photos,
// from the album page's photo grid), and testimonials within a category
// (Testimonials' /reorder, from its grouped list). The client sends the
// group's ids in their new order plus the one that moved.
//
// A reorder isn't an edit, so it writes only the order key, straight to the
// database (payload.db.updateOne): no History version, no hooks, no
// updatedAt change. Normal saves still go through Payload and still create
// History. The site is refreshed afterwards, as a save would.
//
// Keys:
//   - albums, photos and testimonials: normally only the moved item gets a new key,
//     between its new neighbours. If any item in the group has no key yet
//     (saved by older code) or the keys aren't in order, the whole group
//     is renumbered in the order she just set. They're always sorted in
//     code (lib/manual-order.ts).
//   - categories: always renumbered (a0, a1, a2, …), which keeps their keys
//     short. The site sorts them in the database; that's safe because
//     Payload's generator (3.89+) only uses 0-9 and a-z, which the
//     database's en_US collation orders the same as character codes. Only
//     an uppercase key would sort differently there, and none is made.
//
// Part of payload.config.ts's module graph (collections import it), so no
// "@/…" imports.

type Target =
  | { collection: "categories"; field: "_order"; scope: null }
  | { collection: "events"; field: "albumOrder"; scope: { field: "category"; id: number } }
  | { collection: "photos"; field: "albumOrder"; scope: { field: "event"; id: number } }
  | { collection: "testimonials"; field: "listOrder"; scope: { field: "category"; id: number } };

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export async function reorderWithin({
  req,
  target,
  order,
  moved,
  mustBeLast,
}: {
  req: PayloadRequest;
  target: Target;
  order: number[];
  moved: number;
  /** An id that has to stay last (the CRM-only "Other" category). */
  mustBeLast?: number;
}): Promise<Response> {
  if (!req.user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { docs } = await req.payload.find({
    collection: target.collection,
    where: target.scope ? { [target.scope.field]: { equals: target.scope.id } } : {},
    select: { [target.field]: true },
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  });
  const keyById = new Map(docs.map((doc) => [doc.id as number, ((doc as unknown as Record<string, unknown>)[target.field] as string | null) ?? null]));

  // The page's list has to match what's saved, or the new order would be
  // applied to a list she isn't looking at.
  const sameItems = order.length === keyById.size && order.every((id) => keyById.has(id)) && new Set(order).size === order.length;
  if (!sameItems || !keyById.has(moved)) {
    return Response.json({ error: "This list changed somewhere else. Reload the page and try again." }, { status: 409 });
  }
  if (mustBeLast !== undefined && keyById.has(mustBeLast) && order.at(-1) !== mustBeLast) {
    return Response.json({ error: "\"Other\" always stays last." }, { status: 400 });
  }

  const others = order.filter((id) => id !== moved).map((id) => keyById.get(id));
  const allKeyed = others.every((key): key is string => Boolean(key));
  const inOrder = allKeyed && others.every((key, i) => i === 0 || compare(others[i - 1] as string, key as string) < 0);

  const updates = new Map<number, string>();
  if (target.collection !== "categories" && inOrder) {
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

  for (const [id, key] of updates) {
    await req.payload.db.updateOne({
      collection: target.collection,
      id,
      data: { [target.field]: key },
      req,
    });
  }
  if (updates.size > 0) await revalidateSite(req);

  return Response.json({ updated: updates.size });
}
