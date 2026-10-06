import { headers as getHeaders } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { mockInstagramAllowed } from "@/lib/instagram-connection";
import { INSTAGRAM_SLOTS } from "@/lib/instagram-limits";
import { instagramStatus } from "@/lib/instagram-status";
import { syncSlot } from "@/lib/instagram-sync";

// "Connect" on an empty Instagram account card. Stubbed until the real
// Instagram API is set up (lib/instagram-real-provider.ts):
//   - where mock posts are allowed (local dev), it connects the slot to the
//     mock provider and syncs it, so the two-account layout can be tried;
//   - everywhere else it answers 501 with a plain "not yet" message.
//
// TODO(instagram): the real flow redirects to Instagram's OAuth consent
// screen (a GET that returns a redirect, with `slot` and a CSRF `state`),
// and a callback route swaps the code for a long-lived token, saving it in
// Instagram Tokens and the account on its Instagram Connection.
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { slot?: unknown } | null;
  const slot = Number(body?.slot);
  if (!(INSTAGRAM_SLOTS as readonly number[]).includes(slot)) {
    return Response.json({ error: "Unknown account." }, { status: 400 });
  }
  if (!mockInstagramAllowed()) {
    return Response.json(
      { error: "Connecting another Instagram account isn't available yet. It's coming once Instagram is set up." },
      { status: 501 },
    );
  }
  const result = await syncSlot(payload, slot, undefined, { connectMock: true });
  return Response.json({ result, status: await instagramStatus(payload) });
}
