import type { Payload } from "payload";
import { UPLOAD_FOLDERS } from "#src/lib/upload-folders.ts";

// Removes everything the mock Instagram provider made from the shared
// database and R2 (scripts/instagram-clear-mock.ts): mock videos, mock
// posts, mock connections, then any mock file left in R2 without a record.
//
// It may only ever delete files under the two mock prefixes
// (MOCK_FILE_PREFIXES: "instagram/mock-…" images, "instagram-videos/mock-…"
// videos), never a real post's file or anything else in the bucket (her
// Backstage videos, photos). So:
//   - every mock video and post record is checked first (mockFileProblem):
//     its file must be a plain "mock-…" name in its own collection's folder;
//     if any isn't, nothing at all is deleted;
//   - R2 leftovers are listed under the mock prefixes only and each key is
//     checked again (isMockFileKey) before it's deleted.
// R2 is passed in (list / delete), so tests can prove it with fakes
// (tests/unit/instagram-mock-cleanup.test.mts).
//
// "#src/" imports only, so unit tests can load it.

export const MOCK_FILE_PREFIXES = [
  `${UPLOAD_FOLDERS["instagram-posts"]}/mock-`,
  `${UPLOAD_FOLDERS["instagram-videos"]}/mock-`,
] as const;

// A file name as the mock provider makes them ("mock-2-07.mp4",
// "mock-1-01-320x400.jpg", a Payload "-1" suffix): no folders, no "..".
const MOCK_NAME = /^mock-[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?$/;

/** A key that is a mock file directly under one of the mock prefixes. */
export function isMockFileKey(key: string): boolean {
  const slash = key.indexOf("/");
  if (slash < 0) return false;
  const folder = key.slice(0, slash);
  const name = key.slice(slash + 1);
  const isMockFolder = MOCK_FILE_PREFIXES.some((prefix) => prefix === `${folder}/mock-`);
  return isMockFolder && MOCK_NAME.test(name) && !name.includes("..");
}

type FileRecord = {
  id: number | string;
  filename?: string | null;
  prefix?: string | null;
  sizes?: Record<string, { filename?: string | null } | null | undefined> | null;
};

/** Why deleting this record could remove a file that isn't a mock one, or null if it can't. */
export function mockFileProblem(collection: "instagram-posts" | "instagram-videos", record: FileRecord): string | null {
  const folder = UPLOAD_FOLDERS[collection];
  if (record.prefix && record.prefix !== folder) return `${collection} ${record.id} is stored under "${record.prefix}", not "${folder}".`;
  const names = [record.filename, ...Object.values(record.sizes ?? {}).map((size) => size?.filename)].filter(
    (name): name is string => Boolean(name),
  );
  if (!record.filename) return `${collection} ${record.id} has no file name.`;
  const bad = names.find((name) => !isMockFileKey(`${folder}/${name}`));
  return bad ? `${collection} ${record.id} has a file that isn't a mock one: "${bad}".` : null;
}

export type R2Access = {
  listKeys(prefix: string): Promise<string[]>;
  deleteKeys(keys: string[]): Promise<void>;
};

export type CleanupSummary = {
  videos: string[];
  posts: string[];
  connections: string[];
  leftovers: string[];
};

export async function clearMockInstagram(
  payload: Payload,
  r2: R2Access,
  { dryRun }: { dryRun: boolean },
): Promise<CleanupSummary> {
  const { docs: posts } = await payload.find({
    collection: "instagram-posts",
    where: { isMock: { equals: true } },
    select: { igId: true, filename: true, prefix: true, sizes: true },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });
  // Mock videos, and any video on a mock post (deleting the post would
  // delete it too, InstagramPosts.ts).
  const { docs: videos } = await payload.find({
    collection: "instagram-videos",
    where: {
      or: [{ isMock: { equals: true } }, ...(posts.length ? [{ post: { in: posts.map((post) => post.id) } }] : [])],
    },
    select: { filename: true, prefix: true },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });
  const { docs: connections } = await payload.find({
    collection: "instagram-connections",
    where: { isMock: { equals: true } },
    select: { slot: true, username: true },
    limit: 0,
    depth: 0,
  });

  const problems = [
    ...videos.map((video) => mockFileProblem("instagram-videos", video)),
    ...posts.map((post) => mockFileProblem("instagram-posts", post as FileRecord)),
  ].filter((problem): problem is string => Boolean(problem));
  if (problems.length) {
    throw new Error(`Nothing was removed: ${problems.join(" ")}`);
  }

  if (!dryRun) {
    if (videos.length) {
      await payload.delete({ collection: "instagram-videos", where: { id: { in: videos.map((v) => v.id) } }, depth: 0, overrideAccess: true });
    }
    if (posts.length) {
      await payload.delete({ collection: "instagram-posts", where: { id: { in: posts.map((p) => p.id) } }, depth: 0, overrideAccess: true });
    }
    if (connections.length) {
      // Their tokens first (mock connections have none, but the token's
      // connection link is required).
      const ids = connections.map((c) => c.id);
      await payload.delete({ collection: "instagram-tokens", where: { connection: { in: ids } }, depth: 0, overrideAccess: true });
      await payload.delete({ collection: "instagram-connections", where: { id: { in: ids } }, depth: 0, overrideAccess: true });
    }
  }

  // Files under the mock prefixes that no record owns (a sync that failed
  // halfway). On a dry run the records above still exist, so their own
  // files aren't leftovers.
  const owned = new Set(
    dryRun
      ? [
          ...videos.map((video) => `${UPLOAD_FOLDERS["instagram-videos"]}/${video.filename}`),
          ...posts.flatMap((post) => {
            const record = post as FileRecord;
            return [record.filename, ...Object.values(record.sizes ?? {}).map((size) => size?.filename)]
              .filter((name): name is string => Boolean(name))
              .map((name) => `${UPLOAD_FOLDERS["instagram-posts"]}/${name}`);
          }),
        ]
      : [],
  );
  const leftovers: string[] = [];
  for (const prefix of MOCK_FILE_PREFIXES) {
    for (const key of await r2.listKeys(prefix)) {
      if (isMockFileKey(key) && !owned.has(key)) leftovers.push(key);
    }
  }
  if (!dryRun && leftovers.length) await r2.deleteKeys(leftovers.filter(isMockFileKey));

  return {
    videos: videos.map((video) => video.filename ?? String(video.id)),
    posts: posts.map((post) => post.igId),
    connections: connections.map((c) => `slot ${c.slot} (@${c.username ?? "?"})`),
    leftovers,
  };
}
