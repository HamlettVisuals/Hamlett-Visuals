import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";
import { UPLOAD_FOLDERS } from "./src/lib/upload-folders";

// Photos uploaded through the Photos collection are stored in R2 (see
// payload.config.ts's s3Storage plugin) and served from R2_ENDPOINT's own
// host, not this app's origin — next/image needs that host allow-listed to
// optimize them. Derived from the same env var the storage plugin already
// uses, rather than hardcoding the account id.
const r2Hostname = process.env.R2_ENDPOINT
  ? new URL(process.env.R2_ENDPOINT).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Backstage makes video thumbnails and checks clip length with the ffmpeg
  // binary from `ffmpeg-static` (lib/backstage-media.ts). It's loaded at run
  // time from its own folder, so it stays out of the bundle, and the
  // binary is traced in by hand — only into the Payload API route, where
  // uploads are saved (~78MB on Linux; the function limit is 250MB).
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/hv-studio/api/[...slug]": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
  // Required now that the app has two root layouts — (site) and (payload) —
  // so there's no single layout to compose a global 404 from. See
  // app/global-not-found.tsx and node_modules/next/dist/docs/.../not-found.md.
  experimental: {
    globalNotFound: true,
  },
  // The kanban board is the admin's home screen — Payload's default
  // dashboard card grid is never shown. Done here (not via
  // admin.components.views.dashboard) so it happens at the routing layer,
  // before Payload renders anything: no flash of the old grid, and it covers
  // every way of reaching the admin root at once — post-login (Payload's
  // login form pushes to routes.admin unless ?redirect= is set), the
  // breadcrumb home icon, and direct visits. Exact match only, so /login,
  // /collections/*, etc. are untouched (no login redirect loop). Keep in
  // sync with routes.admin in payload.config.ts and the kanban view's path.
  async redirects() {
    return [
      { source: "/hv-studio", destination: "/hv-studio/kanban", permanent: false },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Next.js 16 restricts `quality` to this allowlist by default ([75] only);
    // grid thumbnails use 90, the lightbox uses 95.
    qualities: [75, 90, 95],
    // Uploaded files are served from Payload's file route, and their URLs
    // carry the collection's folder in the bucket, e.g.
    // /hv-studio/api/photos/file/x.jpg?prefix=photos (src/lib/upload-folders.ts).
    // Next.js 16 only optimizes a local image with a query string it's been
    // told about, so each collection's route is allowed with exactly its
    // own `?prefix=`, and every other local image with no query at all.
    localPatterns: [
      ...Object.entries(UPLOAD_FOLDERS).map(([slug, folder]) => ({
        pathname: `/hv-studio/api/${slug}/file/**`,
        search: `?prefix=${folder}`,
      })),
      { pathname: "/**", search: "" },
    ],
    remotePatterns: r2Hostname
      ? [{ protocol: "https", hostname: r2Hostname, pathname: "/**" }]
      : [],
  },
};

export default withPayload(nextConfig);
