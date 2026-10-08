import type { Payload } from "payload";
import sharp from "sharp";
import { INSTAGRAM_SLOTS } from "@/lib/instagram-limits";
import { mockInstagramAllowed, REAL_ONLY_ON_LIVE_SITE, realInstagramAllowed } from "@/lib/instagram-connection";
import { createMockProvider } from "@/lib/instagram-mock-provider";
import type { InstagramProvider, ProviderMedia } from "@/lib/instagram-provider";
import { KEEP_PER_ACCOUNT, postsToPrune } from "@/lib/instagram-prune";
import { realProvider } from "@/lib/instagram-real-provider";
import { copyVideos, newVideoBudget, type VideoBudget, type VideoReport } from "@/lib/instagram-videos";
import type { InstagramConnection, InstagramPost } from "@/payload-types";

// Copies each connected account's recent Instagram posts into Payload
// (collections/InstagramPosts.ts) with their images in R2, so the homepage
// never reads Instagram itself. Run once a day by the cron route
// (app/api/cron/instagram-sync) and by the studio's "Sync now".
//
// Per account: fetch its recent posts from the provider, add new ones
// (image copied into R2), update changed captions/links, record the
// connection's status and sync time, then prune to the latest
// KEEP_PER_ACCOUNT plus anything featured. A real sync also clears the mock
// posts left on that account from before it was really connected.
//
// A provider only touches its own kind of connection: the mock provider
// never overwrites a real connection (local dev shares the live database),
// and the real one leaves mock connections alone.

export function instagramProvider(payload: Payload): InstagramProvider {
  return mockInstagramAllowed() ? createMockProvider(payload) : realProvider;
}

export type SyncResult = {
  slot: number;
  outcome: "synced" | "skipped" | "failed";
  message?: string;
  created: number;
  updated: number;
  pruned: number;
  failedPosts: number;
  // The video copy after the images (lib/instagram-videos.ts); null when it
  // didn't run.
  videos?: VideoReport | null;
};

// Instagram's images are at most 1440px wide; anything bigger (a mock
// post's source photo) is brought down to that, and everything is saved as
// JPEG.
const MAX_WIDTH = 1440;

async function connectionFor(payload: Payload, slot: number): Promise<InstagramConnection | undefined> {
  const { docs } = await payload.find({
    collection: "instagram-connections",
    where: { slot: { equals: slot } },
    limit: 1,
    depth: 0,
  });
  return docs[0];
}

// Local API only (overrideAccess), never returned from here.
async function tokenFor(payload: Payload, connectionId: number): Promise<{ id: number; accessToken: string } | null> {
  const { docs } = await payload.find({
    collection: "instagram-tokens",
    where: { connection: { equals: connectionId } },
    select: { accessToken: true },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return docs[0]?.accessToken ? { id: docs[0].id, accessToken: docs[0].accessToken } : null;
}

async function featuredPostIds(payload: Payload): Promise<number[]> {
  const section = await payload.findGlobal({ slug: "instagram-section", depth: 0 });
  return (section.accounts ?? []).flatMap((account) =>
    (account.featured ?? []).map((post) => (typeof post === "object" ? post.id : post)),
  );
}

async function savedImage(provider: InstagramProvider, media: ProviderMedia) {
  const { data } = await provider.downloadImage(media);
  const jpeg = await sharp(data).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  return { data: jpeg, mimetype: "image/jpeg", name: `${media.igId}.jpg`, size: jpeg.length };
}

const changed = (post: InstagramPost, media: ProviderMedia) =>
  post.caption !== media.caption ||
  post.permalink !== media.permalink ||
  post.mediaType !== media.mediaType ||
  Date.parse(post.postedAt) !== Date.parse(media.postedAt);

export async function syncSlot(
  payload: Payload,
  slot: number,
  provider: InstagramProvider = instagramProvider(payload),
  // connectMock: mock only, connect this slot if it isn't yet (the studio's
  // stubbed "Connect" button where mock posts are allowed).
  // videoBudget: shared by every slot in one run (the daily cron).
  { connectMock = false, videoBudget = newVideoBudget() }: { connectMock?: boolean; videoBudget?: VideoBudget } = {},
): Promise<SyncResult> {
  const result: SyncResult = { slot, outcome: "skipped", created: 0, updated: 0, pruned: 0, failedPosts: 0 };
  // Off the production deployment a real sync writes nothing at all.
  if (!provider.isMock && !realInstagramAllowed()) return { ...result, message: REAL_ONLY_ON_LIVE_SITE };
  let connection = await connectionFor(payload, slot);

  if (connection && Boolean(connection.isMock) !== provider.isMock) {
    return { ...result, message: `Slot ${slot} is a ${connection.isMock ? "mock" : "real"} connection; left alone.` };
  }
  if (!provider.isMock && connection?.status === "not_connected") {
    // A connect that didn't finish (no Instagram account linked to her Page,
    // say): its message stays on the card until she connects again.
    return { ...result, message: `Slot ${slot} isn't connected.` };
  }
  if (!connection) {
    // A real account only exists once she's connected it. The mock one
    // stands in for @hamlettvisuals in slot 1; slot 2 stays empty until
    // it's "connected" from the studio.
    if (!provider.isMock || (slot !== 1 && !connectMock)) return { ...result, message: `Slot ${slot} isn't connected.` };
    connection = await payload.create({
      collection: "instagram-connections",
      data: { slot, status: "not_connected", isMock: true },
      depth: 0,
    });
  }

  const token = provider.isMock ? null : await tokenFor(payload, connection.id);
  const fetched = await provider.fetchRecentMedia({ slot, accessToken: token?.accessToken ?? null, limit: KEEP_PER_ACCOUNT });
  if (!fetched.ok) {
    await payload.update({
      collection: "instagram-connections",
      id: connection.id,
      data: {
        lastError: fetched.message,
        ...(fetched.reason === "auth" ? { status: "needs_reconnect" as const } : {}),
      },
      depth: 0,
    });
    return { ...result, outcome: "failed", message: fetched.message };
  }

  const { docs: existing } = await payload.find({
    collection: "instagram-posts",
    where: { igId: { in: fetched.media.map((media) => media.igId) } },
    limit: 0,
    depth: 0,
  });
  const byIgId = new Map(existing.map((post) => [post.igId, post]));

  for (const media of fetched.media) {
    const data = {
      igId: media.igId,
      connection: connection.id,
      mediaType: media.mediaType,
      permalink: media.permalink,
      caption: media.caption,
      postedAt: media.postedAt,
      isMock: provider.isMock,
    };
    try {
      const saved = byIgId.get(media.igId);
      if (!saved) {
        await payload.create({ collection: "instagram-posts", data, file: await savedImage(provider, media), depth: 0 });
        result.created++;
      } else if (changed(saved, media)) {
        await payload.update({ collection: "instagram-posts", id: saved.id, data, depth: 0 });
        result.updated++;
      }
    } catch (err) {
      result.failedPosts++;
      payload.logger.error({ err, igId: media.igId }, "[instagram-sync] couldn't save a post");
    }
  }

  await payload.update({
    collection: "instagram-connections",
    id: connection.id,
    data: {
      status: "connected",
      username: fetched.account.username,
      igUserId: fetched.account.igUserId,
      isMock: provider.isMock,
      lastSyncedAt: new Date().toISOString(),
      lastError: result.failedPosts ? `${result.failedPosts} post(s) couldn't be saved; the next sync tries again.` : null,
    },
    depth: 0,
  });

  // Prune: the oldest beyond KEEP_PER_ACCOUNT (unless featured), and on a
  // real sync every mock post left on this account.
  const featured = await featuredPostIds(payload);
  const { docs: saved } = await payload.find({
    collection: "instagram-posts",
    where: { connection: { equals: connection.id } },
    select: { postedAt: true, isMock: true },
    limit: 0,
    depth: 0,
  });
  const leftoverMocks = provider.isMock ? [] : saved.filter((post) => post.isMock).map((post) => post.id);
  const toDelete = new Set([...leftoverMocks, ...postsToPrune(saved.filter((post) => !leftoverMocks.includes(post.id)), featured)]);
  if (toDelete.size) {
    await payload.delete({ collection: "instagram-posts", where: { id: { in: [...toDelete] } }, depth: 0 });
    result.pruned = toDelete.size;
  }

  // Videos last, so they never hold up the images; a failure here doesn't
  // fail the sync (the next run tries again).
  try {
    result.videos = await copyVideos(payload, {
      connection,
      provider,
      accessToken: token?.accessToken ?? null,
      featuredIds: featured,
      budget: videoBudget,
    });
  } catch (err) {
    payload.logger.error({ err: err instanceof Error ? err.message : err, slot }, "[instagram-videos] video copy failed");
  }

  return { ...result, outcome: "synced" };
}

export async function syncAllAccounts(payload: Payload, provider: InstagramProvider = instagramProvider(payload)) {
  const results: SyncResult[] = [];
  const videoBudget = newVideoBudget();
  // One after the other: both share the R2 uploads and the database pool.
  for (const slot of INSTAGRAM_SLOTS) results.push(await syncSlot(payload, slot, provider, { videoBudget }));
  return results;
}

/**
 * Only the video copy, for one connected slot: the studio's "copy videos"
 * calls after Sync now (app/api/instagram/videos) and the copy after she
 * publishes new picks. Null when the slot isn't connected, or this server
 * may not touch it (lib/instagram-videos.ts copyVideos).
 */
export async function copyVideosForSlot(
  payload: Payload,
  slot: number,
  provider: InstagramProvider = instagramProvider(payload),
  budget: VideoBudget = newVideoBudget(),
): Promise<VideoReport | null> {
  const connection = await connectionFor(payload, slot);
  if (!connection || connection.status !== "connected") return null;
  const token = provider.isMock ? null : await tokenFor(payload, connection.id);
  return copyVideos(payload, {
    connection,
    provider,
    accessToken: token?.accessToken ?? null,
    featuredIds: await featuredPostIds(payload),
    budget,
  });
}

/** After she publishes new featured picks: copy their videos, both slots, one budget. */
export async function copyVideosAfterPublish(payload: Payload) {
  const provider = instagramProvider(payload);
  const budget = newVideoBudget();
  for (const slot of INSTAGRAM_SLOTS) {
    try {
      await copyVideosForSlot(payload, slot, provider, budget);
    } catch (err) {
      payload.logger.error({ err: err instanceof Error ? err.message : err, slot }, "[instagram-videos] copy after publish failed");
    }
  }
}

// Every saved token is checked once a day: the provider renews it if it can
// or confirms it still works, and reports when it stops (null: no expiry
// date, as for a Facebook Page token). One Meta refuses marks its account
// as needing reconnecting before the sync even tries it.
export type RefreshResult = { connection: number; outcome: "checked" | "failed"; message?: string };

export async function refreshTokens(payload: Payload, provider: InstagramProvider = instagramProvider(payload)) {
  if (provider.isMock || !realInstagramAllowed()) return [];
  const { docs } = await payload.find({
    collection: "instagram-tokens",
    select: { connection: true, accessToken: true },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });
  const results: RefreshResult[] = [];
  for (const token of docs) {
    const connection = typeof token.connection === "object" ? token.connection.id : token.connection;
    const refreshed = await provider.refreshToken({ accessToken: token.accessToken });
    if (refreshed.ok) {
      await payload.update({
        collection: "instagram-tokens",
        id: token.id,
        data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
        depth: 0,
        overrideAccess: true,
      });
      results.push({ connection, outcome: "checked" });
    } else {
      if (refreshed.reason === "auth") {
        await payload.update({
          collection: "instagram-connections",
          id: connection,
          data: { status: "needs_reconnect", lastError: refreshed.message },
          depth: 0,
        });
      }
      results.push({ connection, outcome: "failed", message: refreshed.message });
    }
  }
  return results;
}
