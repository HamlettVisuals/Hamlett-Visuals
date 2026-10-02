import { draftMode, headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";

// Live Preview of a testimonial (Testimonials.ts livePreview.url): opens
// /testimonials?lpDoc=<id>, scrolled to that card. For a signed-in admin,
// checked here against the /hv-studio session, it first turns on Next's
// preview mode, the only way past the page's cached copy, so the page can
// add the testimonial even while it's hidden (marked "Hidden, preview
// only"). The page checks the session again before showing anything
// hidden, so neither this link nor the preview cookie alone ever shows a
// hidden testimonial to anyone else. Without a session it just opens the
// public page.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^\d+$/.test(id)) redirect("/testimonials");

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  if (user) (await draftMode()).enable();

  // The card, then the top of the page if it isn't there (LivePreviewHighlight).
  redirect(`/testimonials?lpDoc=${id}#live-preview:testimonial-${id},testimonials-top`);
}
