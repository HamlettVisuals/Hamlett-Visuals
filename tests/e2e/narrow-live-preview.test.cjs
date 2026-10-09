// Live Preview on phones (components/admin/NarrowLivePreview.tsx and
// "Live Preview on narrow screens" in admin-overrides.css): every editor
// that opens with the preview opens on its fields on a phone, the eye
// button shows and hides the preview, and that never changes the saved
// open/closed preference. On a desktop each editor still opens as before:
// with the preview unless this user's saved preference says closed.
//
// Every editor with livePreview.openByDefault: 14 globals and a package.
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e narrow-live-preview` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN, API } = require("./lib/harness.cjs");

const r = report("narrow-live-preview");
const { check, section } = r;
const shots = outDir("narrow-live-preview");

const GLOBALS = [
  "about", "booking", "booking-cta", "categories-intro", "featured-offer", "final-cta-footer", "header-nav",
  "hero", "instagram-section", "privacy-policy", "terms", "site-settings", "testimonials-page", "testimonials-teaser",
];

// What the page looks like right now.
const state = (page) =>
  page.evaluate(() => {
    const main = document.querySelector(".collection-edit__main");
    const win = document.querySelector(".live-preview-window");
    const toggler = document.querySelector(".live-preview-toggler");
    const wrapper = document.querySelector(".doc-controls__controls-wrapper");
    const hint = wrapper ? getComputedStyle(wrapper, "::after").content : "none";
    const winBox = win?.getBoundingClientRect();
    return {
      payloadPreviewing: !!toggler?.classList.contains("live-preview-toggler--active"),
      fieldsWidth: Math.round(main?.getBoundingClientRect().width ?? 0),
      previewShown: !!win && getComputedStyle(win).display !== "none" && (winBox?.width ?? 0) > 100,
      label: toggler?.getAttribute("aria-label"),
      hint: hint && hint !== "none" ? hint.replace(/"/g, "") : null,
      vw: document.documentElement.clientWidth,
    };
  });

async function open(page, url) {
  await page.goto(url, { timeout: 120000 });
  await page.locator(".live-preview-toggler").waitFor({ timeout: 60000 });
  await page.locator(".collection-edit__main .field-type").first().waitFor({ state: "attached", timeout: 60000 });
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await launchBrowser();
  const { ctx: phoneCtx, guard: phoneGuard } = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const { ctx: deskCtx } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await phoneCtx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const pkg = (await (await page.request.get(`${API}/pricing-rows?limit=1&depth=0`)).json()).docs[0];
  const editors = [
    ...GLOBALS.map((slug) => ({ name: slug, url: `${ADMIN}/globals/${slug}`, key: `global-${slug}` })),
    ...(pkg ? [{ name: `package "${pkg.title}"`, url: `${ADMIN}/collections/pricing-rows/${pkg.id}`, key: "collection-pricing-rows" }] : []),
  ];
  check("all 15 editors with preview-by-default", editors.length === 15, editors.length);

  // This user's saved open/closed choice for each (none: Payload's default, open).
  const prefsBefore = {};
  for (const e of editors) {
    const res = await page.request.get(`${API}/payload-preferences?where[key][equals]=${e.key}&depth=0&limit=1`);
    prefsBefore[e.key] = (await res.json()).docs?.[0]?.value?.editViewType ?? null;
  }

  // ===== phone
  for (const e of editors) {
    section(`phone: ${e.name}`);
    await open(page, e.url);
    let s = await state(page);
    check("opens on the fields, full width", !s.previewShown && s.fieldsWidth >= s.vw - 80, s);
    check("no 'Edit fields' hint over the fields", s.hint === null, s.hint);
    if (s.payloadPreviewing) check("eye button reads 'Show preview'", s.label === "Show preview", s.label);
    if (e.name === "hero") await page.screenshot({ path: `${shots}/phone-hero-fields.png` });

    const prefWrites = () => phoneGuard.log.filter((x) => x.kind === "faked" && /payload-preferences/.test(x.url) && x.body?.includes("editViewType")).length;
    const writesBefore = prefWrites();
    const wasPreviewing = s.payloadPreviewing;
    await page.locator(".live-preview-toggler").tap();
    await page.waitForTimeout(800);
    s = await state(page);
    check("one tap shows the preview, full screen", s.previewShown && s.fieldsWidth < 40, s);
    check("…with the 'Edit fields' hint and a 'Hide preview' button", s.hint === "Edit fields" && s.label === "Hide preview", { hint: s.hint, label: s.label });
    if (e.name === "hero") await page.screenshot({ path: `${shots}/phone-hero-preview.png` });
    await page.locator(".live-preview-toggler").tap();
    await page.waitForTimeout(800);
    s = await state(page);
    check("another tap goes back to the fields", !s.previewShown && s.fieldsWidth >= s.vw - 80 && s.label === "Show preview", s);
    // Opening a preview Payload had closed is saved, as it always was;
    // showing and hiding one it had open never is.
    check(
      wasPreviewing ? "showing and hiding saved nothing" : "Payload opened its closed preview (saved, as before), hiding it saved nothing",
      prefWrites() - writesBefore === (wasPreviewing ? 0 : 1),
      prefWrites() - writesBefore,
    );
    await checkNoSidewaysScroll(page, r, "no sideways scroll");
  }

  section("phone: the preview follows edits made while it was hidden");
  await open(page, `${ADMIN}/globals/about`);
  await page.locator("#field-heading").fill("About (typed on phone)");
  await page.locator(".live-preview-toggler").tap();
  // The preview is the frame showing the site (not the studio).
  let followed = false;
  for (let i = 0; i < 40 && !followed; i++) {
    for (const frame of page.frames()) {
      if (frame === page.mainFrame() || frame.url().includes("/hv-studio")) continue;
      const text = await frame.evaluate(() => document.body?.innerText ?? "").catch(() => "");
      if (text.includes("About (typed on phone)")) followed = true;
    }
    if (!followed) await page.waitForTimeout(500);
  }
  check("the unsaved heading shows in the preview", followed);
  await page.screenshot({ path: `${shots}/phone-about-preview.png` });

  section("phone: a page opens on its fields every time");
  await open(page, `${ADMIN}/globals/hero`);
  await page.locator(".live-preview-toggler").tap();
  await page.waitForTimeout(800);
  check("Hero: preview shown", (await state(page)).previewShown);
  await open(page, `${ADMIN}/globals/about`);
  check("then About opens on its fields", !(await state(page)).previewShown);
  await page.goBack({ timeout: 120000 });
  await page.locator(".live-preview-toggler").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);
  check("and back on Hero, the fields again", !(await state(page)).previewShown && (await page.url()).includes("/globals/hero"));

  // ===== desktop: as before
  const desk = await deskCtx.newPage();
  desk.on("pageerror", (e) => errors.push(e.message));
  section("desktop 1400x950: as before");
  for (const e of editors) {
    await open(desk, e.url);
    const s = await state(desk);
    const saved = prefsBefore[e.key];
    const shouldPreview = saved === null ? true : saved === "live-preview";
    check(
      `${e.name}: ${shouldPreview ? "opens with the preview beside the fields" : "opens closed, as she last left it"}`,
      shouldPreview ? s.previewShown && s.fieldsWidth > 400 && s.label === "Exit Live Preview" : !s.previewShown && !s.payloadPreviewing,
      { saved, ...s },
    );
    if (e.name === "hero") await desk.screenshot({ path: `${shots}/desktop-hero.png` });
  }
  section("desktop: the eye button is Payload's own");
  await open(desk, `${ADMIN}/globals/hero`);
  const deskBefore = (await state(desk)).payloadPreviewing;
  await desk.locator(".live-preview-toggler").click();
  await desk.waitForTimeout(800);
  check("a click flips Payload's preview", (await state(desk)).payloadPreviewing === !deskBefore);

  section("nothing changed for real");
  for (const e of editors) {
    const res = await page.request.get(`${API}/payload-preferences?where[key][equals]=${e.key}&depth=0&limit=1`);
    const after = (await res.json()).docs?.[0]?.value?.editViewType ?? null;
    if (after !== prefsBefore[e.key]) check(`${e.name}: saved preference unchanged`, false, { before: prefsBefore[e.key], after });
  }
  check("every saved preference unchanged", true);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
