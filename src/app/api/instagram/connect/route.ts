import { headers as getHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { mockInstagramAllowed } from "@/lib/instagram-connection";
import { loginDialogUrl, metaAppFromEnv } from "@/lib/instagram-graph";
import { INSTAGRAM_SLOTS } from "@/lib/instagram-limits";
import { newNonce, OAUTH_TTL_SECONDS, signState, STATE_COOKIE } from "@/lib/instagram-oauth-state";
import { instagramStatus } from "@/lib/instagram-status";
import { syncSlot } from "@/lib/instagram-sync";

// "Connect" / "Reconnect" on an Instagram account card. Studio only.
//   - Where mock posts are allowed (local dev): connects the slot to the
//     mock provider and syncs it, as before.
//   - Otherwise: answers with the Facebook Login URL for the card to go to.
//     `state` is signed and names this slot and this studio user, with a
//     nonce kept in an httpOnly cookie in her browser; the callback
//     (app/api/instagram/callback) refuses anything that doesn't match.
//     Only works on the deployed site: Meta sends her back to
//     META_REDIRECT_URI (lib/instagram-graph.ts).
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { slot?: unknown } | null;
  const slot = Number(body?.slot);
  if (!(INSTAGRAM_SLOTS as readonly number[]).includes(slot)) {
    return Response.json({ error: "Unknown account." }, { status: 400 });
  }
  if (mockInstagramAllowed()) {
    const result = await syncSlot(payload, slot, undefined, { connectMock: true });
    return Response.json({ result, status: await instagramStatus(payload) });
  }

  const app = metaAppFromEnv();
  if (!app) {
    return Response.json({ error: "Instagram isn't set up on this site yet (the Meta app's ID and secret are missing)." }, { status: 501 });
  }
  const nonce = newNonce();
  const state = signState(
    { slot, userId: String(user.id), nonce, expiresAt: Date.now() + OAUTH_TTL_SECONDS * 1000 },
    payload.secret,
  );
  const response = NextResponse.json({ redirect: loginDialogUrl(app, state) });
  response.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Sent on the top-level GET back from facebook.com.
    sameSite: "lax",
    path: "/api/instagram",
    maxAge: OAUTH_TTL_SECONDS,
  });
  return response;
}
