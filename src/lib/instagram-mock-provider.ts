import type { Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Payload } from "payload";
import { mockVideoClip } from "@/lib/instagram-mock-video";
import { VideoTooLargeError, type InstagramProvider, type MediaType, type ProviderMedia } from "@/lib/instagram-provider";
import { r2, r2Bucket, storedFileKey } from "@/lib/r2";

// Stand-in for the real Instagram API (lib/instagram-real-provider.ts) in
// local dev, where Facebook Login can't come back to. Makes MOCK_POSTS
// posts per account from a few of her own site photos, with a mix of
// photos, videos and carousels a few days apart, so the studio's picker and
// the homepage grid can be built and checked against something realistic.
// Only ever used where mock posts are allowed (lib/instagram-connection.ts);
// everything it makes is saved with isMock.

const MOCK_POSTS = 20;
const SOURCE_PHOTOS = 8;

const CAPTIONS = [
  "Golden-hour first dance at a riverside barn",
  "Soft window light for a Sunday portrait session",
  "Pit lane, round four. Fast hands, faster cars",
  "Mid-stride across an open field",
  "Behind the scenes on a coffee roaster's studio day",
  "Twilight exterior for a new listing",
  "The quiet minute before the ceremony",
  "Confetti, then chaos, then the best kind of laughter",
  "Every detail she planned, all in one frame",
  "Race morning: tyres warm, nerves warmer",
  "A whole family, one blanket, zero matching socks",
  "Kitchen light that sells the house by itself",
];

// ~1 in 5 videos, ~1 in 4 carousels, the rest photos.
function mediaTypeFor(n: number): MediaType {
  if (n % 5 === 1) return "video";
  if (n % 4 === 2) return "carousel";
  return "image";
}

type SourcePhoto = { prefix?: string | null; filename?: string | null; mimeType?: string | null };

export function createMockProvider(payload: Payload): InstagramProvider {
  let sources: Promise<SourcePhoto[]> | null = null;
  const sourcePhotos = () =>
    (sources ??= payload
      .find({
        collection: "photos",
        where: { mimeType: { in: ["image/jpeg", "image/png", "image/webp"] } },
        sort: "-createdAt",
        select: { prefix: true, filename: true, mimeType: true },
        limit: SOURCE_PHOTOS,
        depth: 0,
      })
      .then(({ docs }) => docs.filter((doc) => doc.filename)));

  return {
    name: "mock",
    isMock: true,
    async fetchRecentMedia({ slot, limit }) {
      const photos = await sourcePhotos();
      if (!photos.length) {
        return { ok: false, reason: "error", message: "No site photos to make mock posts from." };
      }
      const username = slot === 1 ? "hamlettvisuals" : `hamlettvisuals.${slot}`;
      // Newest the evening before, then roughly every two and a half days.
      // Counted from the start of today (UTC), so syncing again the same day
      // changes nothing.
      const now = Math.floor(Date.now() / 86_400_000) * 86_400_000;
      const media: ProviderMedia[] = Array.from({ length: Math.min(MOCK_POSTS, limit) }, (_, i) => {
        const photo = photos[(i + slot) % photos.length];
        const hoursAgo = 5 + i * 60 + ((i * 7) % 11);
        return {
          igId: `mock-${slot}-${String(i + 1).padStart(2, "0")}`,
          mediaType: mediaTypeFor(i),
          permalink: `https://www.instagram.com/${username}/`,
          caption: CAPTIONS[(i + slot * 3) % CAPTIONS.length],
          postedAt: new Date(now - hoursAgo * 3_600_000).toISOString(),
          imageUrl: `r2:${storedFileKey(photo.prefix, photo.filename as string)}`,
        };
      });
      return { ok: true, account: { igUserId: `mock-${slot}`, username }, media };
    },
    async refreshToken() {
      return { ok: false, reason: "not_configured", message: "Mock accounts have no token." };
    },
    // Every video gets the same generated test clip (lib/instagram-mock-video.ts),
    // saved as its own file; a few have "no video link", as reels with
    // licensed music do on the real API.
    async fetchVideoUrl({ igId }) {
      return { ok: true, url: Number(igId.split("-").at(-1)) % 10 === 7 ? null : `mock-video:${igId}` };
    },
    async downloadVideo(url, maxBytes) {
      if (!url.startsWith("mock-video:")) throw new Error("Not a mock video.");
      const data = await mockVideoClip();
      if (data.length > maxBytes) throw new VideoTooLargeError("The mock video is over the size limit.");
      return { data, mimeType: "video/mp4" };
    },
    async downloadImage(media) {
      const key = media.imageUrl.replace(/^r2:/, "");
      const { Body, ContentType } = await r2().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
      if (!Body) throw new Error(`No file in storage for ${key}.`);
      const chunks: Buffer[] = [];
      for await (const chunk of Body as Readable) chunks.push(Buffer.from(chunk));
      return { data: Buffer.concat(chunks), mimeType: ContentType ?? "image/jpeg" };
    },
  };
}
