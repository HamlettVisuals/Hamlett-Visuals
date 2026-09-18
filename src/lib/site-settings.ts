import { getPayload } from "payload";
import config from "@payload-config";

// Thin wrapper around the Site Settings global — app/icon.tsx and
// app/opengraph-image.tsx both call this rather than reading Payload
// directly, so favicon/OG fallback logic stays in one place. Contact and
// Instagram fields are included too since privacy-policy/page.tsx (a
// non-homepage page, so it can't use useLivePreview) needs the same real
// values without duplicating the Payload call.

export type SiteSettings = {
  siteName: string;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  ogImageAlt: string;
  contact: {
    email: string;
    phoneDisplay: string;
    phoneHref: string;
  };
  instagram: {
    handle: string;
    url: string;
  };
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const payload = await getPayload({ config });
  const settings = await payload.findGlobal({ slug: "site-settings" });

  const favicon =
    settings.favicon && typeof settings.favicon === "object"
      ? settings.favicon
      : null;
  const ogImage =
    settings.ogImage && typeof settings.ogImage === "object"
      ? settings.ogImage
      : null;

  return {
    siteName: settings.siteName,
    faviconUrl: favicon?.url ?? null,
    ogImageUrl: ogImage?.url ?? null,
    ogImageAlt: settings.ogImageAlt || settings.siteName,
    contact: {
      email: settings.contact?.email || "hello@example.com",
      phoneDisplay: settings.contact?.phoneDisplay || "+0 000 000 0000",
      phoneHref: settings.contact?.phoneHref || "tel:+00000000000",
    },
    instagram: {
      handle: settings.instagram?.handle || "@hamlettvisuals",
      url:
        settings.instagram?.url || "https://www.instagram.com/hamlettvisuals/",
    },
  };
}
