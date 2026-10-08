import type { Payload } from "payload";
import { mockInstagramAllowed, realInstagramAllowed } from "#src/lib/instagram-connection.ts";
import { VideoTooLargeError, type InstagramProvider } from "#src/lib/instagram-provider.ts";
import {
  INSTAGRAM_VIDEO_MAX_MB,
  RECENT_WITH_VIDEO,
  RUN_SECONDS,
  VIDEO_PHASE_SECONDS,
  VIDEOS_PER_RUN,
} from "#src/lib/instagram-video-limits.ts";

// Copies the video files of an account's video posts into R2
// (collections/InstagramVideos.ts), for the homepage's hover-to-play tiles.
// Instagram's video links expire, so a fresh one is asked for right before
// each download.
//
// Only the posts that can appear on the homepage keep a video: the
// account's featured picks plus its RECENT_WITH_VIDEO most recent posts
// (videosToKeep). A video whose post leaves that set is deleted (its R2
// file with it); a deleted post takes its video along (InstagramPosts.ts).
//
// Runs after a sync has saved the images (lib/instagram-sync.ts), from the
// studio's "copy videos" calls (app/api/instagram/videos) and after she
// publishes new picks (globals/InstagramSection.ts), each within a budget
// (lib/instagram-video-limits.ts) so it never holds up image syncing or runs
// past the function time limit; what's left is reported as pending.
//
// Same rules as the sync: a real account only on the production
// deployment, mock videos only where mock posts are allowed, and a provider
// only ever touches its own kind of connection.
//
// "#src/" imports only, so unit tests and the Instagram Section's save hook
// can load it.

export type VideoReport = {
  at: string;
  // Video posts that should have a video (featured or recent).
  kept: number;
  // Of those: already copied, copied now, no video link from Instagram
  // (media_url left out, e.g. licensed music), over the size cap, failed
  // (retried next run), or not reached this run.
  alreadyCopied: number;
  copied: number;
  noMediaUrl: number;
  tooLarge: number;
  failed: number;
  pending: number;
  // Videos deleted because their post left the set.
  removed: number;
};

export type VideoBudget = { downloadsLeft: number; runDeadline: number };

/** One run's budget, shared by every account it copies for. */
export function newVideoBudget(runStartedAt = Date.now()): VideoBudget {
  return { downloadsLeft: VIDEOS_PER_RUN, runDeadline: runStartedAt + RUN_SECONDS * 1000 };
}

type Id = number | string;
type PostLike = { id: Id; postedAt: string; mediaType: string };

/**
 * The account's video posts that keep a video: featured picks first (in
 * her order), then the RECENT_WITH_VIDEO most recent posts, newest first;
 * only videos, each once.
 */
export function videosToKeep<T extends PostLike>(posts: T[], featuredIds: Iterable<Id>, recent = RECENT_WITH_VIDEO): T[] {
  const byId = new Map(posts.map((post) => [String(post.id), post]));
  const featured = [...featuredIds].map((id) => byId.get(String(id))).filter((post): post is T => Boolean(post));
  const newest = posts.toSorted((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt)).slice(0, recent);
  const seen = new Set<string>();
  return [...featured, ...newest].filter((post) => {
    const key = String(post.id);
    if (post.mediaType !== "video" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const allowedFor = (provider: InstagramProvider) => (provider.isMock ? mockInstagramAllowed() : realInstagramAllowed());

/**
 * Copies (and prunes) one connection's videos within `budget`, records the
 * report on the connection and returns it. Null when this server may not
 * touch this kind of connection: nothing is read from Instagram or written.
 */
export async function copyVideos(
  payload: Payload,
  {
    connection,
    provider,
    accessToken,
    featuredIds,
    budget,
    now = () => Date.now(),
  }: {
    connection: { id: number; isMock?: boolean | null };
    provider: InstagramProvider;
    accessToken: string | null;
    featuredIds: Id[];
    budget: VideoBudget;
    now?: () => number;
  },
): Promise<VideoReport | null> {
  if (!allowedFor(provider) || Boolean(connection.isMock) !== provider.isMock) return null;
  const phaseDeadline = Math.min(budget.runDeadline, now() + VIDEO_PHASE_SECONDS * 1000);
  const report: VideoReport = {
    at: new Date(now()).toISOString(),
    kept: 0,
    alreadyCopied: 0,
    copied: 0,
    noMediaUrl: 0,
    tooLarge: 0,
    failed: 0,
    pending: 0,
    removed: 0,
  };

  const { docs: posts } = await payload.find({
    collection: "instagram-posts",
    where: { connection: { equals: connection.id } },
    select: { igId: true, mediaType: true, postedAt: true },
    limit: 0,
    depth: 0,
  });
  const keep = videosToKeep(posts, featuredIds);
  const keepIds = new Set(keep.map((post) => post.id));
  report.kept = keep.length;

  const { docs: videos } = posts.length
    ? await payload.find({
        collection: "instagram-videos",
        where: { post: { in: posts.map((post) => post.id) } },
        select: { post: true },
        limit: 0,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] };
  const postOf = (video: (typeof videos)[number]) => (typeof video.post === "object" ? video.post.id : video.post);
  const stale = videos.filter((video) => !keepIds.has(postOf(video)));
  if (stale.length) {
    await payload.delete({
      collection: "instagram-videos",
      where: { id: { in: stale.map((video) => video.id) } },
      depth: 0,
      overrideAccess: true,
    });
    report.removed = stale.length;
  }

  const copied = new Set(videos.map(postOf));
  for (const post of keep) {
    if (copied.has(post.id)) {
      report.alreadyCopied++;
      continue;
    }
    if (budget.downloadsLeft <= 0 || now() >= phaseDeadline) {
      report.pending++;
      continue;
    }
    const link = await provider.fetchVideoUrl({ igId: post.igId, accessToken });
    if (!link.ok) {
      report.failed++;
      payload.logger.warn({ igId: post.igId, reason: link.reason }, `[instagram-videos] no video link: ${link.message}`);
      continue;
    }
    if (!link.url) {
      report.noMediaUrl++;
      continue;
    }
    budget.downloadsLeft--;
    try {
      const { data, mimeType } = await provider.downloadVideo(link.url, INSTAGRAM_VIDEO_MAX_MB * 1024 * 1024);
      await payload.create({
        collection: "instagram-videos",
        data: { post: post.id, isMock: provider.isMock },
        file: { data, mimetype: mimeType, name: `${post.igId}.mp4`, size: data.length },
        depth: 0,
        overrideAccess: true,
      });
      report.copied++;
    } catch (err) {
      if (err instanceof VideoTooLargeError) {
        report.tooLarge++;
      } else {
        report.failed++;
        payload.logger.error({ err: err instanceof Error ? err.message : err, igId: post.igId }, "[instagram-videos] couldn't copy a video");
      }
    }
  }

  await payload.update({
    collection: "instagram-connections",
    id: connection.id,
    data: { lastVideoReport: report },
    depth: 0,
  });
  return report;
}
