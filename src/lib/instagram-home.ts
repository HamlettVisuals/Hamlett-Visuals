import type { Payload } from "payload";
import { connectionIsLive, mockInstagramAllowed } from "@/lib/instagram-connection";
import { INSTAGRAM_SLOTS } from "@/lib/instagram-limits";
import { SINGLE_ACCOUNT_POSTS } from "@/lib/instagram-layout";
import type { InstagramPost, InstagramSection } from "@/payload-types";

// What the homepage Instagram section (components/home/Instagram.tsx) needs
// from the server: the section itself (featured picks populated), which
// account slots are connected, and each connected account's most recent
// synced posts. Only ever the saved copies — never Instagram itself.
// Mock posts only where they're allowed (lib/instagram-connection.ts).

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
  // depth 1: each account's featured picks as posts.
  const section = await payload.findGlobal({ slug: "instagram-section", depth: 1 });
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
