import type { Payload } from "payload";
import { normalizeAccounts } from "@/lib/instagram-accounts";
import {
  checkToken,
  chooseAccount,
  describeLogin,
  grantedPermissions,
  linkedAccountsOf,
  listLinkedAccounts,
  listPages,
  type LinkedAccount,
  type MetaApp,
} from "@/lib/instagram-graph";
import { realProvider } from "@/lib/instagram-real-provider";
import { syncSlot, type SyncResult } from "@/lib/instagram-sync";

// The end of the real connect flow (app/api/instagram/callback and choose):
// given her long-lived Facebook user token, find the Instagram account for
// the slot among those linked to her Pages (lib/instagram-graph.ts
// chooseAccount), then save it:
//   - the Page's token in Instagram Tokens (Local API only, never sent anywhere),
//   - the slot's Instagram Connection: connected, real, its username and id,
//   - "@username" as the slot's username in the Instagram Section global,
// and run its first sync. When it can't (nothing linked, no match, already
// on the other slot) the reason goes on the slot's connection, which the
// studio card shows until she connects again.

export type ConnectOutcome =
  | { kind: "connected"; username: string; result: SyncResult }
  | { kind: "pick"; accounts: { igUserId: string; username: string }[] }
  | { kind: "problem"; message: string };

export const NO_LINKED_ACCOUNT = "No Instagram account linked to a Facebook Page";

async function connectionFor(payload: Payload, slot: number) {
  const { docs } = await payload.find({
    collection: "instagram-connections",
    where: { slot: { equals: slot } },
    limit: 1,
    depth: 0,
  });
  return docs[0];
}

/** The username typed on the slot's card, if any. */
async function slotUsername(payload: Payload, slot: number): Promise<string | null> {
  const section = await payload.findGlobal({ slug: "instagram-section", depth: 0 });
  return normalizeAccounts(section.accounts).find((row) => row.slot === slot)?.handle ?? null;
}

/** Instagram accounts really connected on the other slot. */
async function takenElsewhere(payload: Payload, slot: number): Promise<string[]> {
  const { docs } = await payload.find({
    collection: "instagram-connections",
    where: { and: [{ slot: { not_equals: slot } }, { isMock: { not_equals: true } }, { status: { not_equals: "not_connected" } }] },
    select: { igUserId: true },
    limit: 2,
    depth: 0,
  });
  return docs.flatMap((doc) => (doc.igUserId ? [doc.igUserId] : []));
}

/** The accounts she can pick from for a slot (usernames and ids only). */
export async function accountChoices(
  payload: Payload,
  { slot, userToken, fetchFn = fetch }: { slot: number; userToken: string; fetchFn?: typeof fetch },
) {
  const taken = await takenElsewhere(payload, slot);
  return (await listLinkedAccounts(fetchFn, userToken))
    .filter((account) => !taken.includes(account.igUserId))
    .map(({ igUserId, username }) => ({ igUserId, username }));
}

/** Why the slot didn't connect, kept on its card. */
export async function recordConnectProblem(payload: Payload, slot: number, message: string) {
  const connection = await connectionFor(payload, slot);
  // A real connection that still works stays connected; the card shows the
  // message from the callback instead.
  if (connection && !connection.isMock && connection.status === "connected") return;
  const data = { status: "not_connected" as const, isMock: false, lastError: message };
  if (connection) {
    await payload.update({ collection: "instagram-connections", id: connection.id, data, depth: 0 });
  } else {
    await payload.create({ collection: "instagram-connections", data: { slot, ...data }, depth: 0 });
  }
}

function problemMessage(choice: Exclude<ReturnType<typeof chooseAccount>, { kind: "connect" | "pick" }>): string {
  switch (choice.kind) {
    case "none":
      return `${NO_LINKED_ACCOUNT}. Link your Instagram account to your Facebook Page, then connect again (and tick that Page and account when Facebook asks).`;
    case "no_match":
      return `None of your Facebook Pages is linked to @${choice.wanted} (found ${choice.found.map((u) => `@${u}`).join(", ")}). Fix the username on this card, or clear it to choose, then connect again.`;
    case "taken":
      return `@${choice.username} is already connected as your other account.`;
  }
}

export async function connectWithUserToken(
  payload: Payload,
  { slot, userToken, app, igUserId, fetchFn = fetch }: {
    slot: number;
    userToken: string;
    app: MetaApp;
    // Her pick, when she had several accounts to choose from.
    igUserId?: string;
    fetchFn?: typeof fetch;
  },
): Promise<ConnectOutcome> {
  const pages = await listPages(fetchFn, userToken);
  const accounts = linkedAccountsOf(pages);
  const taken = await takenElsewhere(payload, slot);
  if (igUserId) {
    const picked = accounts.find((account) => account.igUserId === igUserId && !taken.includes(account.igUserId));
    if (!picked) return { kind: "problem", message: "That Instagram account isn't available any more. Connect again." };
    return { kind: "connected", username: picked.username, result: await saveConnection(payload, slot, picked, app, fetchFn) };
  }
  const choice = chooseAccount(accounts, { slotUsername: await slotUsername(payload, slot), takenIgUserIds: taken });

  if (choice.kind === "pick") {
    return { kind: "pick", accounts: choice.accounts.map(({ igUserId: id, username }) => ({ igUserId: id, username })) };
  }
  if (choice.kind !== "connect") {
    let message = problemMessage(choice);
    // What Facebook actually shared, so the card says why (no tokens).
    if (choice.kind === "none" || choice.kind === "no_match") {
      const permissions = await grantedPermissions(fetchFn, userToken).catch(() => null);
      message = `${message} ${describeLogin(permissions, pages)}`;
    }
    await recordConnectProblem(payload, slot, message);
    return { kind: "problem", message };
  }
  return { kind: "connected", username: choice.account.username, result: await saveConnection(payload, slot, choice.account, app, fetchFn) };
}

async function saveConnection(
  payload: Payload,
  slot: number,
  account: LinkedAccount,
  app: MetaApp,
  fetchFn: typeof fetch,
): Promise<SyncResult> {
  const existing = await connectionFor(payload, slot);
  const switched = Boolean(existing && !existing.isMock && existing.igUserId && existing.igUserId !== account.igUserId);
  const data = {
    status: "connected" as const,
    username: account.username,
    igUserId: account.igUserId,
    isMock: false,
    lastError: null,
  };
  const connection = existing
    ? await payload.update({ collection: "instagram-connections", id: existing.id, data, depth: 0 })
    : await payload.create({ collection: "instagram-connections", data: { slot, ...data }, depth: 0 });

  // When Meta's data access for it runs out, if ever; not knowing yet
  // doesn't stop the connect (the daily check fills it in).
  const expiresAt = await checkToken(fetchFn, app, account.pageToken).then(
    (check) => check.expiresAt,
    () => null,
  );
  const { docs: tokens } = await payload.find({
    collection: "instagram-tokens",
    where: { connection: { equals: connection.id } },
    select: { connection: true },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const tokenData = { accessToken: account.pageToken, expiresAt };
  if (tokens[0]) {
    await payload.update({ collection: "instagram-tokens", id: tokens[0].id, data: tokenData, depth: 0, overrideAccess: true });
  } else {
    await payload.create({
      collection: "instagram-tokens",
      data: { connection: connection.id, ...tokenData },
      depth: 0,
      overrideAccess: true,
    });
  }

  // A different account than before on this slot: its old posts and picks go.
  if (switched) {
    await payload.delete({ collection: "instagram-posts", where: { connection: { equals: connection.id } }, depth: 0 });
  }
  const section = await payload.findGlobal({ slug: "instagram-section", depth: 0 });
  await payload.updateGlobal({
    slug: "instagram-section",
    data: {
      accounts: normalizeAccounts(section.accounts).map((row) =>
        row.slot === slot ? { ...row, handle: `@${account.username}`, ...(switched ? { featured: [] } : {}) } : row,
      ),
    },
    depth: 0,
  });

  return syncSlot(payload, slot, realProvider);
}
