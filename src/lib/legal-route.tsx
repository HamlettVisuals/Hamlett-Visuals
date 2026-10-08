import type { Metadata } from "next";
import { draftMode, headers as getHeaders } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import LegalPage from "@/components/LegalPage";
import { LEGAL_PAGES, hasText } from "@/lib/legal-pages";

// The server half of /privacy-policy and /terms: reads the page's global
// and renders it (components/LegalPage.tsx), or 404s while it has no text.
// A signed-in admin in preview mode (app/api/preview/legal) sees it anyway,
// so Live Preview works before the first publish; the session is only read
// in preview mode, so the public page stays cached.

type Href = keyof typeof LEGAL_PAGES;

async function load(href: Href) {
  const payload = await getPayload({ config });
  // depth 1: an internal link's category comes back with its slug.
  const doc = await payload.findGlobal({ slug: LEGAL_PAGES[href].slug, depth: 1 });
  return { payload, doc };
}

export async function legalMetadata(href: Href): Promise<Metadata> {
  const { doc } = await load(href);
  const title = doc.title?.trim() || LEGAL_PAGES[href].title;
  return {
    title: `${title} — Hamlett Visuals`,
    description: `The ${title} of Hamlett Visuals.`,
  };
}

export async function renderLegalPage(href: Href) {
  const { payload, doc } = await load(href);
  let preview = false;
  if ((await draftMode()).isEnabled) {
    const { user } = await payload.auth({ headers: await getHeaders() });
    preview = Boolean(user);
  }
  if (!hasText(doc.body) && !preview) notFound();

  const { slug, title } = LEGAL_PAGES[href];
  return <LegalPage slug={slug} doc={doc} fallbackTitle={title} preview={preview} />;
}
