import { cookies, headers as getHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { connectWithUserToken } from "@/lib/instagram-connect";
import { REAL_ONLY_ON_LIVE_SITE, realInstagramAllowed } from "@/lib/instagram-connection";
import { exchangeCodeForUserToken, metaAppFromEnv } from "@/lib/instagram-graph";
import { OAUTH_TTL_SECONDS, PICK_COOKIE, sealPick, STATE_COOKIE, verifyState } from "@/lib/instagram-oauth-state";

// Where Facebook Login sends her back (META_REDIRECT_URI). Checks the state
// against the cookie set by app/api/instagram/connect and the studio user
// signed in now, swaps the code for a long-lived user token, then connects
// the slot (lib/instagram-connect.ts): saves the Page token, fills in the
// username, runs the first sync. If she has several Instagram accounts and
// the slot has no username, the user token waits encrypted in an httpOnly
// cookie for her pick (app/api/instagram/choose).
//
// Always ends back on the Instagram Section in the studio, with the outcome
// in the query string for the card (components/admin/Instagram/AccountHeader.tsx).
// Never puts a token in a URL, a log or a response.

// The first sync copies up to 50 images into R2.
export const maxDuration = 300;

const STUDIO_PAGE = "/hv-studio/globals/instagram-section";

function back(request: Request, slot: number | null, outcome: "ok" | "pick" | "error", message: string) {
  const url = new URL(STUDIO_PAGE, request.url);
  if (slot) url.searchParams.set("ig-slot", String(slot));
  url.searchParams.set("ig-result", outcome);
  url.searchParams.set("ig-msg", message);
  const response = NextResponse.redirect(url, 303);
  response.cookies.delete({ name: STATE_COOKIE, path: "/api/instagram" });
  return response;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const payload = await getPayload({ config });
  const headers = await getHeaders();
  const { user } = await payload.auth({ headers });
  if (!user) return back(request, null, "error", "Sign in to the studio, then connect again.");

  const cookieNonce = (await cookies()).get(STATE_COOKIE)?.value;
  const state = verifyState(params.get("state"), { secret: payload.secret, cookieNonce });
  if (!state || state.userId !== String(user.id)) {
    return back(request, null, "error", "That sign-in link expired or wasn't started here. Click Connect again.");
  }
  const { slot } = state;

  // She cancelled, or declined the permissions.
  if (params.get("error") || !params.get("code")) {
    return back(request, slot, "error", "Facebook sign-in was cancelled, so nothing changed.");
  }
  if (!realInstagramAllowed()) return back(request, slot, "error", REAL_ONLY_ON_LIVE_SITE);
  const app = metaAppFromEnv();
  if (!app) return back(request, slot, "error", "Instagram isn't set up on this site yet.");

  try {
    const userToken = await exchangeCodeForUserToken(fetch, app, params.get("code") as string);
    const outcome = await connectWithUserToken(payload, { slot, userToken, app });
    if (outcome.kind === "problem") return back(request, slot, "error", outcome.message);
    if (outcome.kind === "pick") {
      const response = back(request, slot, "pick", "Choose which Instagram account to connect.");
      response.cookies.set(
        PICK_COOKIE,
        sealPick({ slot, userId: String(user.id), userToken, expiresAt: Date.now() + OAUTH_TTL_SECONDS * 1000 }, payload.secret),
        { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/instagram", maxAge: OAUTH_TTL_SECONDS },
      );
      return response;
    }
    const { result, username } = outcome;
    return back(
      request,
      slot,
      result.outcome === "synced" ? "ok" : "error",
      result.outcome === "synced"
        ? `Connected @${username}. ${result.created} post${result.created === 1 ? "" : "s"} copied.`
        : `Connected @${username}, but the first sync didn't finish: ${result.message ?? "try Sync now."}`,
    );
  } catch (err) {
    payload.logger.error({ err: err instanceof Error ? err.message : err, slot }, "[instagram-connect] callback failed");
    return back(request, slot, "error", "Connecting didn't work. Try again in a minute.");
  }
}
