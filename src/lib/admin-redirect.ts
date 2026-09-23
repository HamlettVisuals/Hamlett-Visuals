// Post-login return paths for the admin (/hv-studio/login?redirect=...).
//
// Payload's own login form already runs `redirect` through getSafeRedirect,
// which blocks external/protocol-relative URLs but still allows any
// same-origin path (e.g. "/" or "/api/..."). This narrows it to pages
// inside the admin itself — enforced for every login request in
// src/proxy.ts, and used by custom views (KanbanBoard/index.tsx) that have
// to build their own login redirect.
//
// Keep ADMIN_ROUTE in sync with routes.admin in payload.config.ts. It's a
// constant here rather than read from the config because proxy.ts runs
// before (and without loading) Payload.
export const ADMIN_ROUTE = "/hv-studio";

// Returning to these after login would just bounce straight back out again.
const AUTH_PATHS = ["/login", "/logout", "/logout-inactivity", "/forgot", "/reset"];

// Returns the normalized path + query to send the user to, or null if
// `value` isn't a safe in-admin destination.
export function safeAdminRedirect(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  // Only root-relative paths: rejects "https://...", "//evil.com",
  // "/\evil.com", and anything with control characters.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  if ([...raw].some((c) => c.charCodeAt(0) <= 31 || c.charCodeAt(0) === 127)) return null;

  let url: URL;
  try {
    url = new URL(raw, "http://admin.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "http://admin.invalid") return null;

  // Checked on the parsed (dot-segment-resolved) pathname, so
  // "/hv-studio/../api/x" doesn't pass as an admin path.
  const { pathname } = url;
  if (pathname !== ADMIN_ROUTE && !pathname.startsWith(`${ADMIN_ROUTE}/`)) return null;
  if (pathname.startsWith(`${ADMIN_ROUTE}/api/`) || pathname === `${ADMIN_ROUTE}/api`) return null;
  const subPath = pathname.slice(ADMIN_ROUTE.length);
  if (AUTH_PATHS.some((p) => subPath === p || subPath.startsWith(`${p}/`))) return null;

  return `${pathname}${url.search}`;
}

export function adminLoginURL(returnTo?: string | null): string {
  const safe = safeAdminRedirect(returnTo);
  return safe ? `${ADMIN_ROUTE}/login?redirect=${encodeURIComponent(safe)}` : `${ADMIN_ROUTE}/login`;
}
