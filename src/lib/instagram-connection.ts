// What counts as a connected Instagram account, and when mock posts may be
// used. Shared by the Instagram collections (collections/Instagram*.ts), the
// Instagram Section global, the sync (Phase 2) and the homepage.
//
// Mock posts: in local dev (where the real connect can't run) the sync can
// use a mock provider that makes fake posts. Local dev and the live
// site share one database, so mock posts made locally sit in the live
// database too; they're marked `isMock` and only ever made or shown when
// INSTAGRAM_MOCK=1 is set, and never on the production deployment, whatever
// that variable says.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only (here: none) — see the note at the top of that file.

export const CONNECTION_STATUSES = [
  { label: "Not connected", value: "not_connected" },
  { label: "Connected", value: "connected" },
  { label: "Needs reconnecting", value: "needs_reconnect" },
] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number]["value"];

export function mockInstagramAllowed(): boolean {
  return process.env.INSTAGRAM_MOCK === "1" && process.env.VERCEL_ENV !== "production";
}

type ConnectionLike = { status?: string | null; isMock?: boolean | null };

// How the account's last sync went, for the studio card:
//   never:   no successful sync yet (and no failure recorded),
//   ok:      the last sync worked,
//   partial: it worked but some posts couldn't be saved (lastError says),
//   failed:  the last attempt failed (lastError says); lastSyncedAt, if
//            any, is the last one that worked.
// A failed sync writes only lastError; a working one writes lastSyncedAt
// (with lastError only for unsaved posts) in one update, so its updatedAt
// is within moments of lastSyncedAt. Nothing else writes a connected
// account's lastError.
export type SyncState = "never" | "ok" | "partial" | "failed";
const SAME_WRITE_MS = 10_000;

export function syncState(connection: {
  lastSyncedAt?: string | null;
  lastError?: string | null;
  updatedAt?: string | null;
}): SyncState {
  const { lastSyncedAt, lastError, updatedAt } = connection;
  if (!lastError) return lastSyncedAt ? "ok" : "never";
  if (!lastSyncedAt || !updatedAt) return "failed";
  return Date.parse(updatedAt) - Date.parse(lastSyncedAt) > SAME_WRITE_MS ? "failed" : "partial";
}

/**
 * What a real connect writes on the slot's Instagram Connection. The last
 * sync time is kept only when it's the same real account reconnecting: a
 * mock connection's (local dev shares the database) or another account's
 * would read as this account's last sync.
 */
export function realConnectionUpdate(
  existing: { isMock?: boolean | null; igUserId?: string | null } | null | undefined,
  account: { igUserId: string; username: string },
) {
  const real = Boolean(existing && !existing.isMock && existing.igUserId);
  const sameAccount = real && existing?.igUserId === account.igUserId;
  return {
    // A different real account than before: its old posts and picks go.
    switched: real && !sameAccount,
    data: {
      status: "connected" as const,
      username: account.username,
      igUserId: account.igUserId,
      isMock: false,
      lastError: null,
      ...(sameAccount ? {} : { lastSyncedAt: null }),
    },
  };
}

/** Connected, and (for a mock connection) somewhere mock posts may be used. */
export function connectionIsLive(connection: ConnectionLike | null | undefined): boolean {
  if (!connection || connection.status !== "connected") return false;
  return !connection.isMock || mockInstagramAllowed();
}
