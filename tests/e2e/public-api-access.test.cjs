// What a signed-out visitor can read through the API (/hv-studio/api), and
// that the studio still reads everything (src/access/publicRead.ts and each
// collection's access). Read-only: GET requests only (plus one GraphQL POST,
// which is a read), against the real data; nothing is written.
// Run with `npm run test:e2e public-api` (see README.md).
const { launchBrowser, newContext, report, API } = require("./lib/harness.cjs");

const r = report("public-api-access");
const { check, section } = r;

const anon = async (path) => {
  const res = await fetch(API + path);
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
};

(async () => {
  section("private collections are closed signed out");
  for (const slug of ["users", "inquiries", "clients", "checklist-templates", "testimonial-submissions", "testimonial-photos", "payload-preferences", "payload-locked-documents"]) {
    const { status } = await anon(`/${slug}?limit=1`);
    check(`${slug}: refused`, status === 403, status);
  }
  check("a client's photo file: refused", (await fetch(`${API}/testimonial-photos/file/anything.jpg`)).status === 403);

  section("History is closed signed out");
  for (const slug of ["categories", "events", "photos", "testimonials", "pricing-rows", "backstage"]) {
    check(`${slug} versions: refused`, (await anon(`/${slug}/versions?limit=1`)).status === 403);
  }
  for (const slug of ["site-settings", "testimonials-teaser", "testimonials-page", "hero"]) {
    check(`${slug} versions: refused`, (await anon(`/globals/${slug}/versions?limit=1`)).status === 403);
  }

  section("only what the site shows, never the Trash");
  for (const slug of ["categories", "events", "pricing-rows", "backstage", "testimonials"]) {
    const hidden = await anon(`/${slug}?limit=1&depth=0&where[published][equals]=false&trash=true`);
    check(`${slug}: no hidden ones`, hidden.status === 200 && hidden.body.totalDocs === 0, hidden.body?.totalDocs);
    const trashed = await anon(`/${slug}?limit=1&depth=0&trash=true&where[deletedAt][exists]=true`);
    check(`${slug}: nothing from the Trash`, trashed.status === 200 && trashed.body.totalDocs === 0, trashed.body?.totalDocs);
  }
  for (const slug of ["events", "pricing-rows"]) {
    const { body } = await anon(`/${slug}?limit=100&depth=1`);
    const outside = body.docs.filter((d) => !(d.category && typeof d.category === "object" && d.category.published && !d.category.deletedAt));
    check(`${slug}: all in a shown category`, outside.length === 0, outside.map((d) => d.id));
  }
  const categories = await anon("/categories?limit=100&depth=0");
  check("the CRM-only Other category isn't listed", !categories.body.docs.some((c) => c.slug === "other"), categories.body.docs.map((c) => c.slug));
  const testimonials = await anon("/testimonials?limit=100&depth=0");
  check("testimonials leave out source and submission", testimonials.body.docs.every((d) => !("source" in d) && !("submission" in d)), testimonials.body.docs.map((d) => Object.keys(d)));
  check("published testimonials still read", testimonials.body.totalDocs > 0, testimonials.body.totalDocs);

  section("contact phone and photos");
  const settings = (await anon("/globals/site-settings?depth=0")).body;
  const cta = (await anon("/globals/booking-cta?depth=0")).body;
  const footer = (await anon("/globals/final-cta-footer?depth=0")).body;
  const shown = cta.showPhone !== false || footer.showPhone !== false;
  check(
    `the phone is in signed-out reads only while it shows somewhere (shown: ${shown})`,
    shown ? "phone" in (settings.contact ?? {}) : !("phone" in (settings.contact ?? {})),
    settings.contact && Object.keys(settings.contact),
  );
  check("the retired phone fields are left out", !("phoneDisplay" in (settings.contact ?? {})) && !("phoneHref" in (settings.contact ?? {})));
  check("the email stays public", typeof settings.contact?.email === "string");
  const photos = (await anon("/photos?depth=0&limit=200")).body;
  check("photos still read signed out", photos.totalDocs > 0, photos.totalDocs);
  const trashedPhotos = await anon("/photos?limit=1&depth=0&trash=true&where[deletedAt][exists]=true");
  check("photos: nothing from the Trash", trashedPhotos.body.totalDocs === 0, trashedPhotos.body.totalDocs);
  const file = photos.docs.find((d) => d.url)?.url;
  check("a shown photo's file loads signed out", file && (await fetch(new URL(file, API).href)).status === 200, file);

  section("other doors");
  check("GraphQL isn't enabled", (await fetch(`${API}/graphql`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"query":"{__typename}"}' })).status === 404);
  const me = await anon("/users/me");
  check("users/me: no one signed in", me.status === 200 && me.body.user === null);

  section("the studio still reads everything");
  const browser = await launchBrowser();
  const { ctx } = await newContext(browser);
  const page = await ctx.newPage();
  const all = await (await page.request.get(`${API}/categories?limit=100&depth=0`)).json();
  check("signed in, Other is listed", all.docs.some((c) => c.slug === "other"), all.docs.map((c) => c.slug));
  const t = await (await page.request.get(`${API}/testimonials?limit=1&depth=0`)).json();
  check("signed in, testimonials include source", t.docs.length === 0 || "source" in t.docs[0], t.docs[0] && Object.keys(t.docs[0]));
  check("signed in, inquiries read", (await page.request.get(`${API}/inquiries?limit=1&depth=0`)).ok());
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
