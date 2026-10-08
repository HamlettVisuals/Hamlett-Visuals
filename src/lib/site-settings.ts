import { getPayload } from "payload";
import config from "@payload-config";
import { contactDetails, type ContactDetails } from "@/lib/contact-details";

// Thin wrapper around the Site Settings global — app/icon.tsx and
// app/opengraph-image.tsx both call this rather than reading Payload
// directly, so favicon/OG fallback logic stays in one place. Contact
// details (lib/contact-details.ts) are included too, for any server page
// that needs the real values without its own Payload call.

export type SiteSettings = {
  siteName: string;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  ogImageAlt: string;
  contact: ContactDetails;
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
    contact: contactDetails(settings),
  };
}
