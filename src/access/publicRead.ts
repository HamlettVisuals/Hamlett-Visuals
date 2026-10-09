import type { Access, FieldAccess, Where } from "payload";
import { mockInstagramAllowed } from "#src/lib/instagram-connection.ts";

// What a signed-out visitor can read through the API (/hv-studio/api): only
// what the site itself shows. Signed in (the studio), everything.
//
// The site's own pages read on the server through Payload's Local API,
// which skips access control, so these rules never change what a page
// renders; they only stop the public API handing out what's hidden or in
// the Trash. `trash=true` on a request is only a filter in Payload, so "not
// in the Trash" has to be part of the rule itself.
//
// Mirrors the site's rules: a category or Backstage item shows when it's
// published; an album or package also needs its category to show; a
// testimonial shows when it's published (/testimonials doesn't check its
// category).
//
// Part of payload.config.ts's module graph, so no "@/…" imports.

const notTrashed: Where = { deletedAt: { exists: false } };
const published: Where = { published: { equals: true } };
const categoryShown: Where = {
  and: [{ "category.published": { equals: true } }, { "category.deletedAt": { exists: false } }],
};

/** Signed in: everything. Signed out: only `where`. */
const signedOutOnly =
  (where: Where): Access =>
  ({ req: { user } }) =>
    user ? true : where;

/** Published and not in the Trash. */
export const readPublished: Access = signedOutOnly({ and: [published, notTrashed] });

/** Published, not in the Trash, and in a category that's shown too. */
export const readPublishedInShownCategory: Access = signedOutOnly({ and: [published, notTrashed, categoryShown] });

// An album the site shows, reached through `path` (e.g. "event."): the
// same rule as the album's own, readPublishedInShownCategory.
const albumShown = (path: string): Where[] => [
  { [`${path}published`]: { equals: true } },
  { [`${path}deletedAt`]: { exists: false } },
  { [`${path}category.published`]: { equals: true } },
  { [`${path}category.deletedAt`]: { exists: false } },
];

/** Album videos: not in the Trash, in an album the site shows. Records and files alike. */
export const readVideoInShownAlbum: Access = signedOutOnly({ and: [notTrashed, ...albumShown("event.")] });

/** A video's automatic poster: its video is readable signed out. */
export const readPosterOfShownVideo: Access = signedOutOnly({
  and: [{ "video.deletedAt": { exists: false } }, ...albumShown("video.event.")],
});

/**
 * Instagram posts: signed out, the mock ones (lib/instagram-connection.ts)
 * only where mock posts are allowed (local dev; never production). The
 * homepage's image optimizer fetches tile images signed out, so locally it
 * needs them; everywhere else they stay closed.
 */
export const readInstagramPosts: Access = ({ req: { user } }) =>
  user || mockInstagramAllowed() ? true : { isMock: { not_equals: true } };

/** A field only the studio reads (left out of signed-out API reads). */
export const studioOnlyField: FieldAccess = ({ req: { user } }) => Boolean(user);
