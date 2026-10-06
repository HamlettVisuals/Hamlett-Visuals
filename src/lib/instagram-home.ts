import type { Payload } from "payload";
import { connectionIsLive, mockInstagramAllowed } from "#src/lib/instagram-connection.ts";
import { INSTAGRAM_SLOTS } from "#src/lib/instagram-limits.ts";
import { SINGLE_ACCOUNT_POSTS } from "#src/lib/instagram-layout.ts";
import type { InstagramPost, InstagramSection } from "#src/payload-types.ts";

// What the homepage Instagram section (components/home/Instagram.tsx) needs
// from the server: the section itself (featured picks populated), which
// account slots are connected, and each connected account's most recent
// synced posts. Only ever the saved copies — never Instagram itself.
// Mock posts only where they're allowed (lib/instagram-connection.ts).
//
// "#src/" imports rather than "@/" so unit tests can load it with plain
// Node (tests/unit/instagram-production.test.mts).

export type TilePost = {
  id: number;
  url: string;
  caption: string;
  mediaType: InstagramPost["mediaType"];
  permalink: string | null;
};

export type InstagramHome = {
  section: InstagramSection;
  connectedSlots: number[];
  recentBySlot: Record<number, TilePost[]>;
  mockAllowed: boolean;
};

/** A synced post as a tile; null if it has no image or is a mock post where those aren't allowed. */
export function toTilePost(post: unknown, mockAllowed: boolean): TilePost | null {
  if (!post || typeof post !== "object") return null;
  const p = post as Partial<InstagramPost>;
  if (typeof p.id !== "number" || !p.url || (p.isMock && !mockAllowed)) return null;
  return {
    id: p.id,
    url: p.url,
    caption: p.caption ?? "",
    mediaType: p.mediaType ?? "image",
    permalink: p.permalink ?? null,
  };
}

export async function getInstagramHome(payload: Payload): Promise<InstagramHome> {
  const mockAllowed = mockInstagramAllowed();
  // depth 1: each account's featured picks as posts. The section goes to
  // the browser (the component's props are in the page), so each pick is
  // cut down to a tile's fields here, and a mock one is dropped where mock
  // posts aren't allowed — otherwise its caption and file link would ride
  // along in the production page even though no tile shows it.
  const saved = await payload.findGlobal({ slug: "instagram-section", depth: 1 });
  const section: InstagramSection = {
    ...saved,
    accounts: (saved.accounts ?? []).map((account) => ({
      ...account,
      featured: (account.featured ?? [])
        .map((post) => toTilePost(post, mockAllowed))
        .filter((post) => post !== null) as unknown as InstagramPost[],
    })),
  };
  const { docs: connections } = await payload.find({
    collection: "instagram-connections",
    select: { slot: true, status: true, isMock: true },
    limit: 2,
    depth: 0,
  });
  const connectedSlots = INSTAGRAM_SLOTS.filter((slot) => connectionIsLive(connections.find((c) => c.slot === slot)));

  const recentBySlot: Record<number, TilePost[]> = {};
  for (const slot of connectedSlots) {
    const { docs } = await payload.find({
      collection: "instagram-posts",
      where: {
        and: [{ "connection.slot": { equals: slot } }, ...(mockAllowed ? [] : [{ isMock: { not_equals: true } }])],
      },
      sort: "-postedAt",
      // Enough to fill a full grid even if every featured pick is among them.
      limit: SINGLE_ACCOUNT_POSTS * 2,
      depth: 0,
    });
    recentBySlot[slot] = docs.map((post) => toTilePost(post, mockAllowed)).filter((post) => post !== null);
  }
  return { section, connectedSlots, recentBySlot, mockAllowed };
}
