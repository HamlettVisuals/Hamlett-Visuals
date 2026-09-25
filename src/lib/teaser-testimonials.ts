import type { Where } from "payload";
import type { Testimonial } from "#src/payload-types.ts";

// Which testimonials the Testimonials Teaser global ("In their words" on the
// homepage) can show: shown on the site ("published") and not in the Trash.
// One rule, three places, same as lib/featured-package.ts:
//   - AVAILABLE_TESTIMONIAL_WHERE, via testimonialPickOptions(): the
//     picker's options and its filterOptions, which Payload also checks on
//     save (globals/TestimonialsTeaser.ts), so a pick that's been hidden or
//     trashed since blocks saving until it's removed.
//   - availableTestimonials(): the homepage (components/home/Testimonials.tsx)
//     drops those picks, and leaves the section out when none are left.
//   - components/admin/TestimonialPicksNote.tsx names them in the editor.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only — see the note at the top of that file.

export const TESTIMONIAL_PICKS_MAX = 4;

export const AVAILABLE_TESTIMONIAL_WHERE: Where = {
  and: [{ deletedAt: { exists: false } }, { published: { equals: true } }],
};

// The picker's filterOptions: the available ones, narrowed to the current
// picks once there are TESTIMONIAL_PICKS_MAX of them, so the dropdown stops
// offering more (Payload's maxRows alone only refuses a fifth at save).
export function testimonialPickOptions({ data }: { data?: { testimonials?: unknown } }): Where {
  const picked = Array.isArray(data?.testimonials)
    ? data.testimonials
        .map((item) => (typeof item === "object" && item !== null ? (item as { id?: unknown }).id : item))
        .filter((id): id is number | string => typeof id === "number" || typeof id === "string")
    : [];
  if (picked.length < TESTIMONIAL_PICKS_MAX) return AVAILABLE_TESTIMONIAL_WHERE;
  return { and: [AVAILABLE_TESTIMONIAL_WHERE, { id: { in: picked } }] };
}

// The picks as populated by Payload (depth 2: the testimonial, then its
// category). A bare id means it didn't populate, and Payload populates a
// trashed relation as null — both count as unavailable.
export function availableTestimonials(value: unknown): Testimonial[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Testimonial => typeof item === "object" && item !== null)
    .filter((item) => !item.deletedAt && item.published !== false)
    .slice(0, TESTIMONIAL_PICKS_MAX);
}
