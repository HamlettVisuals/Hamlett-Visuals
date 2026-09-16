/**
 * Shared with GallerySkeleton (and the homepage Instagram section) so their
 * tiles line up with the real photo grid. A fixed column count per breakpoint
 * rather than an auto-fill/auto-fit track list: those need to resolve a
 * definite container width to pick a column count, which breaks down inside
 * this app's nested flex page shells, and they stretch a sparse row's tiles
 * to fill the leftover space. A fixed count sizes every tile the same
 * regardless of how many are present — a partial last row just leaves the
 * remaining tracks empty instead of stretching into them.
 *
 * Lives in its own plain module (no "use client") rather than on PhotoGrid
 * itself so Server Components can import the constant directly — pulling a
 * non-component export from a "use client" file across the server/client
 * boundary gets replaced with a proxy that throws instead of the value.
 */
export const PHOTO_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4";
