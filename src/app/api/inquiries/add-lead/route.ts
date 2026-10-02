import { headers as getHeaders } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { isRepeatClient } from "@/hooks/repeatClient";

// Behind the kanban board's "Add Card" button (Board.tsx's AddCardDrawer) —
// for jobs heard about outside the site's own contact form, so unlike
// /api/inquiries/route.ts's deliberately public write path, this one is
// admin-only: checked via payload.auth() against the real /hv-studio
// session, the same pattern as /api/inquiries/[id]/testimonial-request.
//
// Looks up the Client by email before creating one, so re-adding a card for
// someone already in the system links to their existing record instead of
// splitting their history across duplicates.
const MANUAL_SOURCES = ["manual_social", "manual_email", "manual_referral"] as const;
type ManualSource = (typeof MANUAL_SOURCES)[number];

type AddLeadBody = {
  clientName?: unknown;
  email?: unknown;
  category?: unknown;
  type?: unknown;
  preferredDate?: unknown;
  source?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isManualSource(value: unknown): value is ManualSource {
  return typeof value === "string" && (MANUAL_SOURCES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AddLeadBody | null;

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clientName = isNonEmptyString(body?.clientName) ? body.clientName.trim() : "";
  // Lower-cased for a case-insensitive match against what's already on file
  // (and stored the same way), so "Jane@x.com" and "jane@x.com" don't end
  // up as two different Clients.
  const email = isNonEmptyString(body?.email) ? body.email.trim().toLowerCase() : "";
  const categoryId = Number(body?.category);
  const type = body?.type;
  const source = body?.source;
  const preferredDate = isNonEmptyString(body?.preferredDate) ? body.preferredDate : undefined;

  if (
    !clientName ||
    !email ||
    !Number.isFinite(categoryId) ||
    (type !== "question" && type !== "booking") ||
    !isManualSource(source)
  ) {
    return Response.json({ error: "Invalid lead." }, { status: 400 });
  }

  try {
    const existingClients = await payload.find({
      collection: "clients",
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    });

    const clientId = existingClients.docs[0]
      ? existingClients.docs[0].id
      : (
          await payload.create({
            collection: "clients",
            data: { name: clientName, email },
            overrideAccess: true,
          })
        ).id;

    const inquiry = await payload.create({
      collection: "inquiries",
      data: {
        type,
        // Every lead added here is booking-track pipeline work (it always
        // has a category, required below) — the kanban board's Lead column
        // now only shows inquiryType: "booking" records, so this can't be
        // left to the schema default implicitly.
        inquiryType: "booking",
        status: "new",
        stage: "lead",
        name: clientName,
        email,
        client: clientId,
        category: categoryId,
        source,
        preferredDate,
        // Inquiry.message is required, but a lead added here didn't come
        // through the site's own message-based contact form — there's no
        // client-written message to store.
        message: "Added manually — no message on file.",
      },
      depth: 1,
      overrideAccess: true,
    });

    return Response.json({
      success: true,
      inquiry,
      isRepeatClient: await isRepeatClient(clientId, payload),
    });
  } catch (error) {
    payload.logger.error({ err: error }, "[api/inquiries/add-lead] failed to create lead");
    return Response.json({ error: "Failed to add card." }, { status: 500 });
  }
}
