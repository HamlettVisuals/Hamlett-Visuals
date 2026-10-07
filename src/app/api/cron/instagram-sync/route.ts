import { timingSafeEqual } from "node:crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import { instagramProvider, refreshTokens, syncAllAccounts } from "@/lib/instagram-sync";

// The daily Instagram sync (vercel.json `crons`; once a day is the most the
// Hobby plan allows): checks each saved token (renewing it where it can), then copies
// each connected account's recent posts into Payload (lib/instagram-sync.ts).
//
// Vercel calls it with `Authorization: Bearer <CRON_SECRET>`; anything else
// is refused, and with no CRON_SECRET set it refuses everything. The answer
// is counts and plain messages only, never a token.

// The first real sync copies up to 50 images into R2.
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const payload = await getPayload({ config });
  const provider = instagramProvider(payload);
  try {
    const tokens = await refreshTokens(payload, provider);
    const accounts = await syncAllAccounts(payload, provider);
    return Response.json({ provider: provider.name, tokens, accounts });
  } catch (err) {
    payload.logger.error({ err }, "[instagram-sync] cron run failed");
    return Response.json({ error: "The sync failed; see the function logs." }, { status: 500 });
  }
}
