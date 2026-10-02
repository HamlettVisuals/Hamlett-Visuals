import { APIError, type PayloadRequest } from "payload";
import { TESTIMONIAL_PICKS_MAX } from "#src/lib/teaser-testimonials.ts";

// "Show on homepage" for one testimonial: whether it's among the homepage
// Testimonials Section's picks (globals/TestimonialsTeaser.ts), and adding
// or removing it there. One list of picks, so the testimonial's toggle, the
// list rows' Add / Remove action and the section's own editor always agree,
// and the section's order is kept (added at the end, removed in place).
//
// A change here saves the section straight away (a History version on it,
// live at once), the same as pressing its Publish.
//
// Part of payload.config.ts's module graph, so "#src/"-style imports only.

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: unknown }).id : value;

/** The picks' ids, in the section's order. */
export async function homepagePicks(req: PayloadRequest): Promise<number[]> {
  const global = await req.payload.findGlobal({ slug: "testimonials-teaser", depth: 0, req });
  return (global.testimonials ?? [])
    .map((pick) => Number(idOf(pick)))
    .filter((id) => Number.isFinite(id));
}

/**
 * The picks with `id` added or removed. Throws (a 400 she sees) when adding
 * would go over the limit or the testimonial isn't shown on the site.
 */
export function nextPicks(
  picks: number[],
  id: number,
  on: boolean,
  { published }: { published: boolean },
): number[] {
  const has = picks.includes(id);
  if (!on) return has ? picks.filter((pick) => pick !== id) : picks;
  if (has) return picks;
  if (!published) {
    throw new APIError("Publish this testimonial to show it on the homepage.", 400, null, true);
  }
  if (picks.length >= TESTIMONIAL_PICKS_MAX) {
    throw new APIError(
      `The homepage already shows ${TESTIMONIAL_PICKS_MAX} testimonials. Remove one from the homepage first.`,
      400,
      null,
      true,
    );
  }
  return [...picks, id];
}

/** Adds or removes one testimonial; saves the section only when that changes it. */
export async function setHomepagePick(
  req: PayloadRequest,
  id: number,
  on: boolean,
  { published }: { published: boolean },
): Promise<void> {
  const picks = await homepagePicks(req);
  const next = nextPicks(picks, id, on, { published });
  if (next === picks) return;
  await req.payload.updateGlobal({
    slug: "testimonials-teaser",
    data: { testimonials: next },
    depth: 0,
    req,
  });
}
