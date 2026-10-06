import type { Payload } from "payload";
import { connectionIsLive, mockInstagramAllowed, type ConnectionStatus } from "@/lib/instagram-connection";
import { INSTAGRAM_SLOTS } from "@/lib/instagram-limits";

// What the studio's Instagram account cards show for each slot
// (components/admin/Instagram/*), as served by /api/instagram/status. The
// status is the one the site goes by: a mock connection where mock posts
// aren't allowed (production) reads as not connected. Never includes a
// token.

export type AccountStatus = {
  slot: number;
  status: ConnectionStatus;
  username: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  isMock: boolean;
};

export type InstagramStatus = { mockAllowed: boolean; accounts: AccountStatus[] };

export async function instagramStatus(payload: Payload): Promise<InstagramStatus> {
  const { docs } = await payload.find({
    collection: "instagram-connections",
    select: { slot: true, status: true, username: true, lastSyncedAt: true, lastError: true, isMock: true },
    limit: 2,
    depth: 0,
  });
  return {
    mockAllowed: mockInstagramAllowed(),
    accounts: INSTAGRAM_SLOTS.map((slot) => {
      const connection = docs.find((doc) => doc.slot === slot);
      const usable = connection && (!connection.isMock || mockInstagramAllowed());
      return {
        slot,
        status: !usable ? "not_connected" : connectionIsLive(connection) ? "connected" : connection.status,
        username: usable ? (connection.username ?? null) : null,
        lastSyncedAt: usable ? (connection.lastSyncedAt ?? null) : null,
        lastError: usable ? (connection.lastError ?? null) : null,
        isMock: Boolean(usable && connection.isMock),
      };
    }),
  };
}
