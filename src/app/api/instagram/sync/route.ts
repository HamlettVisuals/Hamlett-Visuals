import { headers as getHeaders } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { INSTAGRAM_SLOTS } from "@/lib/instagram-limits";
import { instagramStatus } from "@/lib/instagram-status";
import { syncSlot } from "@/lib/instagram-sync";

// "Sync now" on an Instagram account card: the same sync as the daily cron
// (lib/instagram-sync.ts), for one slot. Studio only. Answers with the
// sync's counts and every slot's fresh status, for the cards.

// A first sync copies up to 50 images into R2.
export const maxDuration = 300;

export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { slot?: unknown } | null;
  const slot = Number(body?.slot);
  if (!(INSTAGRAM_SLOTS as readonly number[]).includes(slot)) {
    return Response.json({ error: "Unknown account." }, { status: 400 });
  }
  try {
    const result = await syncSlot(payload, slot);
    return Response.json({ result, status: await instagramStatus(payload) });
  } catch (err) {
    payload.logger.error({ err, slot }, "[instagram-sync] Sync now failed");
    return Response.json({ error: "The sync didn't finish. Try again in a minute." }, { status: 500 });
  }
}
