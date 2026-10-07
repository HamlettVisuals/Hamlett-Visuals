import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// The connect flow's two short-lived secrets (app/api/instagram/connect and
// callback), keyed off PAYLOAD_SECRET:
//   - `state`, sent through Facebook Login and back: signed, naming the slot
//     and the studio user who started it, and a nonce that must match the
//     httpOnly cookie set in her browser when she clicked Connect, so a
//     callback started by anyone else (or replayed later) is refused;
//   - the pick cookie: when she has several Instagram accounts and the slot
//     has no username, her long-lived user token is kept for the few minutes
//     she takes to pick, encrypted in an httpOnly cookie (never in the
//     database, never readable by the page).
//
// No "@/…" imports, so unit tests can load it directly.

// Long enough to sign in to Facebook and approve; short enough not to linger.
export const OAUTH_TTL_SECONDS = 10 * 60;
export const STATE_COOKIE = "hv_ig_state";
export const PICK_COOKIE = "hv_ig_pick";

export type OAuthState = { slot: number; userId: string; nonce: string; expiresAt: number };

const b64url = (data: Buffer | string) => Buffer.from(data).toString("base64url");
const sign = (body: string, secret: string) => createHmac("sha256", `instagram-state:${secret}`).update(body).digest();

export const newNonce = () => randomBytes(24).toString("base64url");

export function signState(state: OAuthState, secret: string): string {
  const body = b64url(JSON.stringify(state));
  return `${body}.${b64url(sign(body, secret))}`;
}

/**
 * The state if it's signed with our secret, unexpired, and its nonce
 * matches the cookie; otherwise null. (The signed-in user is checked by the
 * caller against `userId`.)
 */
export function verifyState(
  value: string | null | undefined,
  { secret, cookieNonce, now = Date.now() }: { secret: string; cookieNonce: string | null | undefined; now?: number },
): OAuthState | null {
  const [body, signature, extra] = (value ?? "").split(".");
  if (!body || !signature || extra !== undefined) return null;
  const given = Buffer.from(signature, "base64url");
  const expected = sign(body, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let state: OAuthState;
  try {
    state = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
  } catch {
    return null;
  }
  if (typeof state?.expiresAt !== "number" || state.expiresAt < now) return null;
  if (!cookieNonce || typeof state.nonce !== "string") return null;
  const a = Buffer.from(state.nonce);
  const b = Buffer.from(cookieNonce);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return state;
}

// ---- the pick cookie

export type PickTicket = { slot: number; userId: string; userToken: string; expiresAt: number };

const pickKey = (secret: string) => createHash("sha256").update(`instagram-pick:${secret}`).digest();

export function sealPick(ticket: PickTicket, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", pickKey(secret), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(ticket), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b64url).join(".");
}

/** The ticket if it decrypts with our secret and hasn't expired; otherwise null. */
export function openPick(value: string | null | undefined, secret: string, now = Date.now()): PickTicket | null {
  const parts = (value ?? "").split(".");
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", pickKey(secret), iv);
    decipher.setAuthTag(tag);
    const ticket = JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")) as PickTicket;
    return typeof ticket?.expiresAt === "number" && ticket.expiresAt >= now ? ticket : null;
  } catch {
    return null;
  }
}
