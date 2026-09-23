import type { CollectionAfterChangeHook, Payload } from "payload";
import type { Inquiry } from "#src/payload-types.ts";

// Whether a client has more than one Inquiry on file. Kept as a query
// rather than a stored field on Inquiry: a stored flag would go stale the
// moment a later inquiry, deletion, or reassignment changed the count for
// that client without this record being saved again. The future kanban
// view's "Repeat client" badge should call this directly when it renders.
export const isRepeatClient = async (
  clientId: number | string,
  payload: Payload,
): Promise<boolean> => {
  const { totalDocs } = await payload.count({
    collection: "inquiries",
    where: {
      client: { equals: clientId },
    },
  });

  return totalDocs > 1;
};

type LocationLike = { street?: string | null; city?: string | null; state?: string | null } | null | undefined;

type LocatableInquiry = { id: number; location?: LocationLike };

const cityState = (location: LocationLike): string =>
  [location?.city, location?.state].filter(Boolean).join(", ");

// Distinguishes a repeat client's concurrently-open jobs from each other on
// the kanban card face. `siblings` must be every OTHER currently-open
// (non-archived) Inquiry on the board for the same client — not this
// inquiry's own record. City+state is usually enough to tell jobs apart;
// this only falls back to the street for a job whose city+state collides
// with another currently-open job for the same client, so jobs that don't
// collide still show the shorter city/state form. No siblings (client isn't
// currently juggling more than one open job) or no location set at all on
// this inquiry both mean nothing worth showing — see Card.tsx.
export function getDistinguisherLocation(
  inquiry: LocatableInquiry,
  siblings: LocatableInquiry[],
): string | null {
  if (siblings.length === 0) return null;

  const thisCityState = cityState(inquiry.location);
  if (!thisCityState) return null;

  const collides = siblings.some((sibling) => cityState(sibling.location) === thisCityState);
  if (!collides) return thisCityState;

  return inquiry.location?.street || thisCityState;
}

// Logs repeat-client status whenever an Inquiry is saved with a client set.
// Doesn't persist anything itself — see isRepeatClient above for why — this
// just surfaces it until the kanban view exists to show the badge.
export const logRepeatClient: CollectionAfterChangeHook<Inquiry> = async ({
  doc,
  req,
}) => {
  const clientId = typeof doc.client === "object" ? doc.client?.id : doc.client;
  if (!clientId) return doc;

  if (await isRepeatClient(clientId, req.payload)) {
    req.payload.logger.info(
      `[inquiries] client ${clientId} is a repeat client (more than one inquiry on file).`,
    );
  }

  return doc;
};
