// The homepage's Offers & pricing rows and the spotlight card (#hot-offer)
// show the category under the package name only when it's different from
// the name. Checked on the homepage with the saved packages, then with an
// unsaved title typed in the featured package's editor, in Live Preview
// (nothing is saved).
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e offers-category` (see README.md).
const { launchBrowser, newContext, report, outDir, BASE, ADMIN, API } = require("./lib/harness.cjs");

const r = report("offers-category");
const { check, section } = r;
const shots = outDir("offers-category");

// Each package title on the page: where it is, and the category line under it, if any.
const titles = (scope) =>
  scope.locator("#offers h3, #hot-offer h3").evaluateAll((hs) =>
    hs.map((h) => ({
      where: h.closest("#hot-offer") ? "spotlight" : "row",
      title: h.textContent.trim(),
      // The category line (not the price that follows when it is left out).
      category: h.nextElementSibling?.matches("p.mt-1.text-caption") ? h.nextElementSibling.textContent.trim() : null,
    })),
  );

const expected = (title, cat) => (cat && cat.toLowerCase() !== title.trim().toLowerCase() ? cat : null);

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  const errors = [];
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));

  section("homepage, saved packages");
  const { docs } = await (await page.request.get(`${API}/pricing-rows?depth=1&limit=100&where[published][equals]=true`)).json();
  const featured = await (await page.request.get(`${API}/globals/featured-offer?depth=1`)).json();
  await page.goto(`${BASE}/`, { timeout: 120000 });
  await page.locator("#offers h3").first().waitFor({ timeout: 60000 });
  const shown = await titles(page);
  check("spotlight is on the page", shown.some((t) => t.where === "spotlight"), shown);
  for (const t of shown) {
    const cat = docs.find((d) => d.title.trim() === t.title)?.category?.name?.trim();
    const want = expected(t.title, cat);
    check(`${t.where} "${t.title}": ${want ? `category "${want}" shown` : "no category line (same as name)"}`, t.category === want, t);
  }
  await page.locator("#hot-offer").screenshot({ path: `${shots}/homepage-spotlight.png` });
  await page.locator("#offers").screenshot({ path: `${shots}/homepage-offers.png` });
  await page.close();

  section("Live Preview, unsaved title (featured package)");
  const pkg = docs.find((d) => d.id === featured.featuredPackage?.id) ?? docs[0];
  const catName = pkg.category?.name?.trim();
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ADMIN}/collections/pricing-rows/${pkg.id}`, { timeout: 120000 });
  await page.locator("#field-title").waitFor({ timeout: 60000 });
  if (!(await page.locator(".live-preview-window iframe").count())) await page.locator(".live-preview-toggler").click().catch(() => {});
  const frame = page.frameLocator(".live-preview-window iframe").first();
  await frame.locator(`#package-${pkg.id} h3`).waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  const both = async (title) => (await titles(frame)).filter((t) => t.title === title.trim());

  for (const title of [pkg.title, `${pkg.title} Plus`, pkg.title]) {
    if (title !== pkg.title || (await page.locator("#field-title").inputValue()) !== title) {
      await page.locator("#field-title").fill(title);
      await page.waitForTimeout(2500);
    }
    const found = await both(title);
    const want = expected(title, catName);
    check(`"${title}": spotlight and row ${want ? `show "${want}"` : "show no category line"}`,
      found.length === 2 && found.some((t) => t.where === "spotlight") && found.every((t) => t.category === want), found);
    if (title.endsWith("Plus")) await page.screenshot({ path: `${shots}/preview-differs.png` });
  }
  await page.close();

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
