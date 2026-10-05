import type { PayloadRequest } from "payload";

// Ending studio logins (Users.ts). Payload keeps each login as a session on
// the user (auth.useSessions, its default) and checks on every request that
// the token's session still exists, so removing sessions signs those devices
// out on their next request. Payload's own logout removes one (or all, with
// ?allSessions=true, the account page's "Sign out everywhere"); this ends
// the others when the password changes, keeping only the device that
// changed it.
//
// Part of payload.config.ts's module graph, so no "@/…" imports.

type Session = { id: string; createdAt?: unknown; expiresAt?: unknown };

/** The sessions left after a password change: only `keep`, if it's one of them. */
export const sessionsAfterPasswordChange = (sessions: Session[] | null | undefined, keep: string | null | undefined) =>
  (sessions ?? []).filter((session) => keep != null && session.id === keep);

/** The session id inside one of our own freshly signed tokens (no need to verify it). */
export function sessionIdFromToken(token: string | null | undefined): string | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sid?: unknown };
    return typeof decoded.sid === "string" ? decoded.sid : null;
  } catch {
    return null;
  }
}

/**
 * Leaves the user with only the `keep` session (none if it's null). Straight
 * in the database, the way Payload's own logout does it: no History version,
 * no updatedAt change.
 */
export async function endOtherSessions(req: PayloadRequest, userId: number | string, keep: string | null) {
  const user = await req.payload.db.findOne<Record<string, unknown> & { id: number | string }>({
    collection: "users",
    where: { id: { equals: userId } },
    req,
  });
  if (!user) return;
  const sessions = (user.sessions as Session[] | undefined) ?? [];
  const next = sessionsAfterPasswordChange(sessions, keep);
  if (next.length === sessions.length) return;
  user.sessions = next;
  user.updatedAt = null;
  await req.payload.db.updateOne({ collection: "users", id: userId, data: user, req, returning: false });
}
