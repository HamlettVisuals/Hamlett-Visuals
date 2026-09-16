// Data-layer seam for swappable site branding (favicon, Open Graph image).
// Mirrors lib/inquiries.ts's submitInquiry stub: until there's an admin
// upload flow and a database/CMS to back it, this returns hardcoded
// placeholders. Swap this function's body for a real fetch once that
// exists — app/icon.tsx and app/opengraph-image.tsx both call
// getSiteSettings() rather than hardcoding paths, so only this file needs
// to change.

export type SiteSettings = {
  faviconUrl: string | null;
  ogImageUrl: string | null;
  ogImageAlt: string;
};

export async function getSiteSettings(): Promise<SiteSettings> {
  return {
    faviconUrl: null,
    ogImageUrl: null,
    ogImageAlt: "Hamlett Visuals",
  };
}
