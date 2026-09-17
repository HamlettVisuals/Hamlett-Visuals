import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  // Required now that the app has two root layouts — (site) and (payload) —
  // so there's no single layout to compose a global 404 from. See
  // app/global-not-found.tsx and node_modules/next/dist/docs/.../not-found.md.
  experimental: {
    globalNotFound: true,
  },
  images: {
    // Local images under public/photos are optimized automatically —
    // no remotePatterns needed since nothing is fetched from an external host.
    formats: ["image/avif", "image/webp"],
    // Next.js 16 restricts `quality` to this allowlist by default ([75] only);
    // grid thumbnails use 90, the lightbox uses 95.
    qualities: [75, 90, 95],
  },
};

export default withPayload(nextConfig);
