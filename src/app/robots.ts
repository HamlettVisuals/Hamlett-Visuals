import type { MetadataRoute } from "next";

// /hv-studio (the admin CMS) is also kept out of search results via a
// per-page noindex meta tag — see src/app/(payload)/layout.tsx. Disallow
// here just asks crawlers not to bother requesting it in the first place.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/hv-studio",
    },
  };
}
