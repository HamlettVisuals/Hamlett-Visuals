// The retired Photos page: no sidebar entry, list and Trash URLs redirect, a photo's ✕ and breadcrumbs go to its album or Unused photos, "Remove from album" says where the photo went, every photo field can upload directly.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e photos-page-retired` (see README.md).
const { launchBrowser, newContext, report, outDir, ADMIN, API } = require("./lib/harness.cjs");

const r = report("photos-page-retired");
const { check } = r;
const shots = outDir("photos-page-retired");


(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const crumbs = async () => (await page.locator(".step-nav").innerText().catch(() => "")).replace(/\s+/g, " ").trim();

  // 1. Sidebar and Editor overview.
  await page.goto(`${ADMIN}/editor`, { timeout: 120000 });
  await page.waitForTimeout(3000);
  const navText = await page.locator("nav, aside.nav").first().innerText();
  check("sidebar has no Photos link", !(await page.locator(`a[href="/hv-studio/collections/photos"]`).count()), navText.includes("Photos") ? "text 'Photos' still in nav" : "");
  const overview = await page.locator("main, .template-default__wrap").first().innerText();
  check("Editor overview has no Photos entry", !/\bPhotos\b/.test(overview.replace(/Unused photos/g, "")), overview.match(/.{0,40}Photos.{0,40}/)?.[0]);

  // 2. Redirects (GET only) and pages that still open.
  await page.goto(`${ADMIN}/collections/photos`, { timeout: 120000 });
  check("Photos list → Categories & Albums", new URL(page.url()).pathname === "/hv-studio/portfolio", page.url());
  await page.goto(`${ADMIN}/collections/photos/trash`, { timeout: 120000 });
  check("Photos Trash → Trash tab", new URL(page.url()).pathname === "/hv-studio/portfolio/trash", page.url());
  await page.goto(`${ADMIN}/collections/photos/create`, { timeout: 120000 });
  await page.waitForTimeout(3000);
  check("/collections/photos/create still opens", page.url().endsWith("/collections/photos/create"));

  // 3. A photo in an album: ✕ and breadcrumbs go to the album.
  await page.goto(`${ADMIN}/collections/photos/38`, { timeout: 120000 });
  await page.locator(".close-editor-button").waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);
  const x = page.locator(".close-editor-button");
  check("in an album: ✕ → the album", (await x.getAttribute("href")) === "/hv-studio/collections/events/16" && (await x.getAttribute("aria-label")) === "Back to Vacation Test", `${await x.getAttribute("href")} ${await x.getAttribute("aria-label")}`);
  check("in an album: breadcrumbs", (await crumbs()).includes("Categories & Albums") && (await crumbs()).includes("Vacation Test") && !(await crumbs()).startsWith("Photos"), await crumbs());
  check("sidebar marks Categories & Albums on a photo page", (await page.locator(`a[href="/hv-studio/portfolio"][aria-current="page"], a[href="/hv-studio/portfolio"].active, a[href="/hv-studio/portfolio"][class*="active"]`).count()) > 0);
  await page.screenshot({ path: `${shots}/11-photo-in-album.png` });
  await page.locator(".step-nav a", { hasText: "Vacation Test" }).click();
  await page.waitForURL(/collections\/events\/16/, { timeout: 30000 });
  check("breadcrumb album link opens the album", true);
  // History tab keeps the ✕ too.
  await page.goto(`${ADMIN}/collections/photos/38/versions`, { timeout: 120000 });
  await page.locator(".close-editor-button").waitFor({ timeout: 60000 });
  await page.waitForFunction(() => document.querySelector(".close-editor-button")?.getAttribute("href")?.includes("/events/"), null, { timeout: 10000 }).catch(() => {});
  check("History tab: ✕ → the album", (await page.locator(".close-editor-button").getAttribute("href")) === "/hv-studio/collections/events/16");

  // 4. Photos in no album (#31 is a used cover, #33 is unused): → Unused photos.
  for (const id of [31, 33]) {
    await page.goto(`${ADMIN}/collections/photos/${id}`, { timeout: 120000 });
    await page.locator(".close-editor-button").waitFor({ timeout: 60000 });
    await page.waitForTimeout(2500);
    check(`#${id} in no album: ✕ → Unused photos`, (await page.locator(".close-editor-button").getAttribute("href")) === "/hv-studio/portfolio#unused-photos");
    check(`#${id} in no album: breadcrumbs`, /Categories & Albums.*Unused photos/.test(await crumbs()), await crumbs());
  }
  await page.screenshot({ path: `${shots}/11-photo-unused.png` });
  await page.locator(".close-editor-button").click();
  await page.waitForURL(/portfolio/, { timeout: 30000 });
  await page.locator("#unused-photos .unused-photos__photo").first().waitFor({ timeout: 30000 });
  check("✕ lands on Categories & Albums with Unused photos open", page.url().endsWith("/portfolio#unused-photos"));

  // 5. The album page's own breadcrumbs survive the photo drawer.
  await page.goto(`${ADMIN}/collections/events/16`, { timeout: 120000 });
  await page.locator(".album-photos__tile").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  const albumCrumbs = await crumbs();
  await page.locator(".album-photos__tile").first().locator(".album-photos__menu-button").click();
  await page.getByRole("button", { name: "Edit photo details" }).click();
  await page.locator(".drawer__content").last().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  check("drawer leaves the album page's breadcrumbs alone", (await crumbs()) === albumCrumbs, `${albumCrumbs} → ${await crumbs()}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);

  // 6. Remove from album says where the photo went (the PATCH is faked; the
  //    usage check is real). #35 is Test's page photo, #36 is used nowhere.
  await page.route(/\/hv-studio\/api\/photos\/\d+$/, (route) =>
    route.request().method() === "PATCH" ? route.fulfill({ json: { doc: {}, message: "ok" } }) : route.fallback(),
  );
  await page.goto(`${ADMIN}/collections/events/15`, { timeout: 120000 });
  await page.locator(".album-photos__tile").first().waitFor({ timeout: 60000 });
  const tileOf = async (id) => {
    const srcs = await page.$$eval(".album-photos__tile .album-photos__img", (els) => els.map((e) => e.getAttribute("src")));
    const photo = await (await page.request.get(`${API}/photos/${id}?depth=0`)).json();
    return srcs.findIndex((s) => s && decodeURIComponent(s).includes(photo.sizes.thumbnail.filename));
  };
  for (const [id, expect] of [[35, 'still used as the top of the "Test" category page'], [36, "now under Unused photos"]]) {
    const i = await tileOf(id);
    await page.locator(".album-photos__tile").nth(i).locator(".album-photos__menu-button").click();
    await page.getByRole("button", { name: "Remove from album" }).click();
    const alt = (await (await page.request.get(`${API}/photos/${id}?depth=0`)).json()).alt;
    const toast = page.locator("[data-sonner-toast]").filter({ hasText: `Removed "${alt}"` }).first();
    await toast.waitFor({ timeout: 15000 });
    check(`Remove from album #${id}: says where it went`, (await toast.innerText()).includes(expect), await toast.innerText());
    await page.waitForTimeout(1500);
  }

  // 7. Every photo field lets her upload a new photo from the field itself.
  const fieldPages = [
    ["Weddings category (cover, page photo)", `${ADMIN}/collections/categories/11`, ["coverPhoto", "heroPhoto"]],
    ["Site Settings (tab icon, share image)", `${ADMIN}/globals/site-settings`, ["favicon", "ogImage"]],
    ["New testimonial (photo)", `${ADMIN}/collections/testimonials/create`, ["photo"]],
  ];
  for (const [name, url, fields] of fieldPages) {
    await page.goto(url, { timeout: 120000 });
    await page.waitForTimeout(4000);
    for (const f of fields) {
      const field = page.locator(`#field-${f}, .field-type.upload:has([id*="${f}"])`).first();
      const create = page.locator(`[id="field-${f}"] .upload__createNewToggler, .field-type:has(#field-${f}) .upload__createNewToggler`).first();
      const hasCreate = (await create.count()) > 0 || (await field.locator(".upload__createNewToggler").count()) > 0;
      const filled = (await page.locator(`.field-type:has(#field-${f}) .upload-relationship-details, [id="field-${f}"] .upload-relationship-details`).count()) > 0;
      check(`${name} › ${f}: Create New there (or filled: edit/remove)`, hasCreate || filled, hasCreate ? "Create New" : filled ? "filled" : "neither");
    }
    await page.screenshot({ path: `${shots}/11-fields-${fields[0]}.png`, fullPage: true });
  }
  // Filled fields (Motorsports cover, a hero slide, About portrait): screenshot for the report.
  for (const [n, url] of [["motorsports", `${ADMIN}/collections/categories/26`], ["hero", `${ADMIN}/globals/hero`], ["about", `${ADMIN}/globals/about`]]) {
    await page.goto(url, { timeout: 120000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${shots}/11-filled-${n}.png`, fullPage: true });
  }

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
