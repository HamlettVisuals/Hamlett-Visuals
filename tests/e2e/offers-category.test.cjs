// Offers & pricing rows on the homepage show the category under the package
// name only when it's different from the name. Checked on the homepage
// with the saved packages, then with an unsaved title typed in the Packages
// editor's Live Preview (nothing is saved).
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e offers-category` (see README.md).
const { launchBrowser, newContext, report, outDir, BASE, ADMIN, API } = require("./lib/harness.cjs");

const r = report("offers-category");
const { check, section } = r;
const shots = outDir("offers-category");

// Each row: its title and the category line under it, if any.
const rows = (scope) =>
  scope.locator("#offers h3").evaluateAll((hs) =>
    hs.map((h) => ({ title: h.textContent.trim(), category: h.nextElementSibling?.matches("p") ? h.nextElementSibling.textContent.trim() : null })),
  );

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  const errors = [];
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));

  section("homepage, saved packages");
  const { docs } = await (await page.request.get(`${API}/pricing-rows?depth=1&limit=100&where[published][equals]=true`)).json();
  await page.goto(`${BASE}/`, { timeout: 120000 });
  await page.locator("#offers h3").first().waitFor({ timeout: 60000 });
  const shown = await rows(page);
  for (const row of shown) {
    const pkg = docs.find((d) => d.title.trim() === row.title);
    const cat = pkg?.category?.name?.trim();
    const same = cat && cat.toLowerCase() === row.title.toLowerCase();
    check(`"${row.title}": ${same ? "no category line (same as name)" : `category "${cat}" shown`}`, same ? row.category === null : row.category === cat, row);
  }
  await page.locator("#offers").screenshot({ path: `${shots}/homepage-offers.png` });
  await page.close();

  section("Live Preview, unsaved title");
  const pkg = docs.find((d) => d.category?.name?.trim().toLowerCase() === d.title.trim().toLowerCase()) ?? docs[0];
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ADMIN}/collections/pricing-rows/${pkg.id}`, { timeout: 120000 });
  await page.locator("#field-title").waitFor({ timeout: 60000 });
  if (!(await page.locator(".live-preview-window iframe").count())) await page.locator(".live-preview-toggler").click().catch(() => {});
  const frame = page.frameLocator(".live-preview-window iframe").first();
  await frame.locator(`#package-${pkg.id} h3`).waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  const rowIn = async () => (await rows(frame)).find((x) => x.title === (pkg.title + suffix).trim());
  let suffix = "";
  const catName = pkg.category?.name?.trim();
  check(`before: "${pkg.title}" row`, (await rowIn())?.category === (catName?.toLowerCase() === pkg.title.trim().toLowerCase() ? null : catName), await rowIn());
  suffix = " Plus";
  await page.locator("#field-title").fill(pkg.title + suffix);
  await page.waitForTimeout(2500);
  check(`typed "${pkg.title}${suffix}": category "${catName}" appears`, (await rowIn())?.category === catName, await rows(frame));
  await page.screenshot({ path: `${shots}/preview-differs.png` });
  suffix = "";
  await page.locator("#field-title").fill(pkg.title);
  await page.waitForTimeout(2500);
  check("typed back: matches again", (await rowIn())?.category === (catName?.toLowerCase() === pkg.title.trim().toLowerCase() ? null : catName), await rows(frame));
  await page.close();

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
