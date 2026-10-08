import { headers as getHeaders } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { INSTAGRAM_SLOTS } from "@/lib/instagram-limits";
import { copyVideosForSlot } from "@/lib/instagram-sync";

// One more round of video copying for a slot (lib/instagram-videos.ts),
// within one run's budget: the studio card calls it after "Sync now" while
// the sync reports videos still pending. Studio only. Same rules as the
// sync: a real account only on the production deployment, mock only where
// mock posts are allowed; otherwise it answers `report: null` and changes
// nothing.

// A round downloads at most a few videos (lib/instagram-video-limits.ts).
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
    return Response.json({ report: await copyVideosForSlot(payload, slot) });
  } catch (err) {
    payload.logger.error({ err: err instanceof Error ? err.message : err, slot }, "[instagram-videos] copy call failed");
    return Response.json({ error: "Copying videos didn't finish. The next sync tries again." }, { status: 500 });
  }
}
