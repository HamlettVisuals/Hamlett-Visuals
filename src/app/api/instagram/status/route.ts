import { headers as getHeaders } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { instagramStatus } from "@/lib/instagram-status";

// The Instagram Section's account cards (components/admin/Instagram/*):
// each slot's status, username and last sync. Studio only, checked with
// payload.auth() like /api/inquiries/add-lead. Never includes a token.
export async function GET() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  return Response.json(await instagramStatus(payload));
}
