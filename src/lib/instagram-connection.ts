// What counts as a connected Instagram account, and when mock posts may be
// used. Shared by the Instagram collections (collections/Instagram*.ts), the
// Instagram Section global, the sync (Phase 2) and the homepage.
//
// Mock posts: until her account is confirmed as a Professional account the
// sync runs a mock provider that makes fake posts. Local dev and the live
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

/** Connected, and (for a mock connection) somewhere mock posts may be used. */
export function connectionIsLive(connection: ConnectionLike | null | undefined): boolean {
  if (!connection || connection.status !== "connected") return false;
  return !connection.isMock || mockInstagramAllowed();
}
