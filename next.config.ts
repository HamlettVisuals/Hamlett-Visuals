import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

// Photos uploaded through the Photos collection are stored in R2 (see
// payload.config.ts's s3Storage plugin) and served from R2_ENDPOINT's own
// host, not this app's origin — next/image needs that host allow-listed to
// optimize them. Derived from the same env var the storage plugin already
// uses, rather than hardcoding the account id.
const r2Hostname = process.env.R2_ENDPOINT
  ? new URL(process.env.R2_ENDPOINT).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Required now that the app has two root layouts — (site) and (payload) —
  // so there's no single layout to compose a global 404 from. See
  // app/global-not-found.tsx and node_modules/next/dist/docs/.../not-found.md.
  experimental: {
    globalNotFound: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Next.js 16 restricts `quality` to this allowlist by default ([75] only);
    // grid thumbnails use 90, the lightbox uses 95.
    qualities: [75, 90, 95],
    remotePatterns: r2Hostname
      ? [{ protocol: "https", hostname: r2Hostname, pathname: "/**" }]
      : [],
  },
};

export default withPayload(nextConfig);
