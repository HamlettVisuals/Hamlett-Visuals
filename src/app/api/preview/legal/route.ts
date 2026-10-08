import { draftMode, headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { LEGAL_PAGES } from "@/lib/legal-pages";

// Live Preview of the Privacy Policy or Terms (globals/LegalPages.ts). The
// public page 404s until it has text, which would leave her nothing to
// preview while writing it for the first time. So for a signed-in admin,
// checked here against the /hv-studio session, this turns on Next's preview
// mode first, and the page then shows itself even while empty. The page
// checks the session again, so the preview cookie alone never shows an
// empty page to anyone else. Without a session it just opens the page.
const PAGES = new Set<string>(Object.values(LEGAL_PAGES).map((page) => page.slug));

export async function GET(request: Request) {
  const page = new URL(request.url).searchParams.get("page") ?? "";
  if (!PAGES.has(page)) redirect("/");

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (user) (await draftMode()).enable();

  redirect(`/${page}`);
}
