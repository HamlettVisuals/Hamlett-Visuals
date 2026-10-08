import { cookies, headers as getHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { accountChoices, connectWithUserToken } from "@/lib/instagram-connect";
import { REAL_ONLY_ON_LIVE_SITE, realInstagramAllowed } from "@/lib/instagram-connection";
import { metaAppFromEnv } from "@/lib/instagram-graph";
import { openPick, PICK_COOKIE } from "@/lib/instagram-oauth-state";
import { instagramStatus } from "@/lib/instagram-status";

// Her pick, when Facebook Login found several Instagram accounts and the
// card had no username (app/api/instagram/callback left her user token in
// an encrypted httpOnly cookie for a few minutes). Studio only, and only
// the studio user who started the connect.
//   GET  ?slot=N         → the accounts to choose from (usernames, no tokens)
//   POST { slot, igUserId } → connects that one, like the callback would

// The first sync copies up to 50 images into R2.
export const maxDuration = 300;

async function ticketFor(slot: number) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (!user) return { payload, error: Response.json({ error: "Unauthorized." }, { status: 401 }) };
  if (!realInstagramAllowed()) return { payload, error: Response.json({ error: REAL_ONLY_ON_LIVE_SITE }, { status: 501 }) };
  const ticket = openPick((await cookies()).get(PICK_COOKIE)?.value, payload.secret);
  const app = metaAppFromEnv();
  if (!ticket || ticket.slot !== slot || ticket.userId !== String(user.id) || !app) {
    return { payload, error: Response.json({ error: "That choice expired. Click Connect again." }, { status: 410 }) };
  }
  return { payload, ticket, app };
}

export async function GET(request: Request) {
  const slot = Number(new URL(request.url).searchParams.get("slot"));
  const { payload, ticket, error } = await ticketFor(slot);
  if (error) return error;
  try {
    return Response.json({ accounts: await accountChoices(payload, { slot, userToken: ticket.userToken }) });
  } catch (err) {
    payload.logger.error({ err: err instanceof Error ? err.message : err, slot }, "[instagram-connect] listing accounts failed");
    return Response.json({ error: "Couldn't load your Instagram accounts. Click Connect again." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { slot?: unknown; igUserId?: unknown } | null;
  const slot = Number(body?.slot);
  const igUserId = typeof body?.igUserId === "string" ? body.igUserId : "";
  const { payload, ticket, app, error } = await ticketFor(slot);
  if (error) return error;
  if (!igUserId) return Response.json({ error: "Pick an account." }, { status: 400 });
  try {
    const outcome = await connectWithUserToken(payload, { slot, userToken: ticket.userToken, app, igUserId });
    const status = await instagramStatus(payload);
    if (outcome.kind !== "connected") {
      return Response.json({ error: outcome.kind === "problem" ? outcome.message : "Pick an account.", status }, { status: 409 });
    }
    const response = NextResponse.json({ result: outcome.result, username: outcome.username, status });
    response.cookies.delete({ name: PICK_COOKIE, path: "/api/instagram" });
    return response;
  } catch (err) {
    payload.logger.error({ err: err instanceof Error ? err.message : err, slot }, "[instagram-connect] connecting the pick failed");
    return Response.json({ error: "Connecting didn't work. Try again in a minute." }, { status: 500 });
  }
}
