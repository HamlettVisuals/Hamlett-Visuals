import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeAdminRedirect } from "@/lib/admin-redirect";

// The Categories and Packages lists are reordered by dragging (`orderable`
// in Categories.ts / PricingRows.ts), which only works with every row on one page and sorted by the drag order.
// Payload's list view prefers the user's saved per-page and sort settings
// over the collection's defaultLimit/defaultSort, and it saves whatever the
// URL says back into those settings. So any list load that asks for
// something else is redirected to limit=100&sort=_order, which also
// overwrites a stale saved setting on the first visit. GET only: Payload's
// server actions POST to this same path.
const DRAG_LIST_QUERY = { limit: "100", sort: "_order" };
const DRAG_LISTS = ["/hv-studio/collections/categories", "/hv-studio/collections/pricing-rows"];

function forceDragListQuery(request: NextRequest) {
  if (request.method !== "GET") return null;
  const url = request.nextUrl.clone();
  let changed = false;
  for (const [key, value] of Object.entries(DRAG_LIST_QUERY)) {
    if (url.searchParams.get(key) !== value) {
      url.searchParams.set(key, value);
      changed = true;
    }
  }
  if (changed && url.searchParams.has("page")) url.searchParams.delete("page");
  return changed ? NextResponse.redirect(url) : null;
}

// Restricts the admin login's ?redirect= to pages inside /hv-studio (see
// lib/admin-redirect.ts). Payload's login form trusts any same-origin path;
// this runs first and rewrites the URL so the form only ever sees a safe
// value — an unsafe one is dropped, which falls back to the admin root
// (-> the kanban board, via next.config.ts's redirect).
function restrictLoginRedirect(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  if (!searchParams.has("redirect")) return NextResponse.next();

  const raw = searchParams.get("redirect");
  const safe = safeAdminRedirect(raw);
  if (safe === raw) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (safe) url.searchParams.set("redirect", safe);
  else url.searchParams.delete("redirect");
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (DRAG_LISTS.some((list) => pathname === list || pathname === `${list}/trash`)) {
    return forceDragListQuery(request) ?? NextResponse.next();
  }
  return restrictLoginRedirect(request);
}

// Must be static literals (Next parses them at compile time), so they can't
// use ADMIN_ROUTE — keep in sync by hand.
export const config = {
  matcher: [
    "/hv-studio/login",
    "/hv-studio/collections/categories",
    "/hv-studio/collections/categories/trash",
    "/hv-studio/collections/pricing-rows",
    "/hv-studio/collections/pricing-rows/trash",
  ],
};
