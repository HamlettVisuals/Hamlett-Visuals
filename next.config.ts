import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local images under public/photos are optimized automatically —
    // no remotePatterns needed since nothing is fetched from an external host.
    formats: ["image/avif", "image/webp"],
    // Next.js 16 restricts `quality` to this allowlist by default ([75] only);
    // grid thumbnails use 90, the lightbox uses 95.
    qualities: [75, 90, 95],
  },
};

export default nextConfig;
