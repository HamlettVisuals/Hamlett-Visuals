import { getPayload } from "payload";
import config from "@payload-config";

// Public write path for the site's two contact forms (AskQuestionPanel,
// BookingForm — see src/lib/inquiries.ts's submitInquiry). The Inquiries
// collection's own `create` access stays admin-only (src/collections/
// Inquiries.ts), so this is the one place allowed to create a record on a
// visitor's behalf — via overrideAccess, after doing its own validation of
// the shape below, rather than opening the collection itself to the public.
type InquiryBody = {
  type?: unknown;
  // The CRM-side booking/question split (src/collections/Inquiries.ts) —
  // separate from `type` above, which is older and purely descriptive.
  // `category` is only required (both here and by the collection's own
  // conditional validate) when this is "booking".
  inquiryType?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  preferredDate?: unknown;
  category?: unknown;
  location?: unknown;
  sourcePage?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// `location` is optional and every subfield within it is optional too
// (BookingForm shows it for every category, but a client can leave the
// venue blank if they haven't picked one yet) — so the only thing worth
// rejecting here is a subfield sent as a non-string, non-undefined value.
function isValidLocation(
  value: unknown,
): value is { street?: string; city?: string; state?: string } | undefined {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null) return false;
  const { street, city, state } = value as Record<string, unknown>;
  return (
    (street === undefined || typeof street === "string") &&
    (city === undefined || typeof city === "string") &&
    (state === undefined || typeof state === "string")
  );
}

// Trims each subfield and drops it if blank; returns undefined altogether
// once every subfield is blank, so a fully-empty location on the wire
// doesn't create an empty-but-present group on the Inquiry.
function sanitizeLocation(
  location: { street?: string; city?: string; state?: string } | undefined,
) {
  if (!location) return undefined;
  const street = isNonEmptyString(location.street) ? location.street.trim() : undefined;
  const city = isNonEmptyString(location.city) ? location.city.trim() : undefined;
  const state = isNonEmptyString(location.state) ? location.state.trim() : undefined;
  if (!street && !city && !state) return undefined;
  return { street, city, state };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as InquiryBody | null;

  if (
    !body ||
    (body.type !== "question" && body.type !== "booking") ||
    (body.inquiryType !== "question" && body.inquiryType !== "booking") ||
    !isNonEmptyString(body.name) ||
    !isNonEmptyString(body.email) ||
    !isNonEmptyString(body.message) ||
    typeof body.sourcePage !== "string" ||
    (body.inquiryType === "booking" && typeof body.category !== "number") ||
    !isValidLocation(body.location)
  ) {
    return Response.json({ error: "Invalid inquiry." }, { status: 400 });
  }

  const payload = await getPayload({ config });

  try {
    await payload.create({
      collection: "inquiries",
      data: {
        type: body.type,
        inquiryType: body.inquiryType,
        status: "new",
        stage: "lead",
        name: body.name.trim(),
        email: body.email.trim(),
        phone: isNonEmptyString(body.phone) ? body.phone.trim() : undefined,
        message: body.message.trim(),
        preferredDate: isNonEmptyString(body.preferredDate)
          ? body.preferredDate
          : undefined,
        category: typeof body.category === "number" ? body.category : undefined,
        location: sanitizeLocation(
          body.location as { street?: string; city?: string; state?: string } | undefined,
        ),
        sourcePage: body.sourcePage,
      },
      overrideAccess: true,
    });
    return Response.json({ success: true });
  } catch (error) {
    payload.logger.error({ err: error }, "[api/inquiries] failed to create inquiry");
    return Response.json({ error: "Failed to save inquiry." }, { status: 500 });
  }
}
