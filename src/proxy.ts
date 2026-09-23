import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeAdminRedirect } from "@/lib/admin-redirect";

// Restricts the admin login's ?redirect= to pages inside /hv-studio (see
// lib/admin-redirect.ts). Payload's login form trusts any same-origin path;
// this runs first and rewrites the URL so the form only ever sees a safe
// value — an unsafe one is dropped, which falls back to the admin root
// (-> the kanban board, via next.config.ts's redirect).
export function proxy(request: NextRequest) {
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

// Must be a static literal (Next parses it at compile time), so it can't
// use ADMIN_ROUTE — keep in sync by hand.
export const config = {
  matcher: "/hv-studio/login",
};
