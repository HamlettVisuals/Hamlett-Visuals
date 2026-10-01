// The Featured Offer editor: the "Show on homepage" switch (greys out the
// fields below, hides the spotlight and the Offers & pricing badge in Live
// Preview), the package dropdown's labels (no "None", category only when it
// differs from the name) and its warnings (hidden package, no sample
// photos). Variations the live data doesn't have (a hidden package, an
// album with or without photos) come from mocked API replies.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real
// except the mocked ones. Nothing is saved.
// Run with `npm run test:e2e featured-offer` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, BASE, ADMIN, API } = require("./lib/harness.cjs");

const r = report("featured-offer");
const { check, section } = r;
const shots = outDir("featured-offer");
const URL_ = `${ADMIN}/globals/featured-offer`;
const FOLLOWING = ["featuredPackage", "heading", "badgeLabel"];

async function open(page) {
  await page.goto(URL_, { timeout: 120000 });
  await page.locator("[role='switch']").first().waitFor({ timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector(".featured-package-field")?.innerText.includes("Loading packages"), null, { timeout: 30000 });
  await page.waitForTimeout(2000);
}

const switchState = (page) =>
  page.evaluate(() => {
    const sw = document.querySelector(".show-on-website [role='switch']");
    return {
      checked: sw?.getAttribute("aria-checked"),
      label: document.querySelector(".show-on-website__label")?.textContent,
      pill: document.querySelector(".show-on-website .category-status")?.textContent,
    };
  });

const greyed = (page) =>
  page.evaluate((names) => names.map((n) => {
    const el = document.querySelector(`#field-${n}`)?.closest(".featured-package-field, .field-type");
    return { n, found: !!el, inert: !!el?.inert, cls: !!el?.classList.contains("featured-offer-off") };
  }), FOLLOWING);

const warnings = (page) => page.locator(".featured-package-field__warning").allInnerTexts();

async function dropdownOptions(page) {
  await page.locator(".featured-package-field .react-select").click();
  await page.waitForTimeout(500);
  const opts = await page.locator("[id*='-option-']").allInnerTexts();
  await page.keyboard.press("Escape");
  return opts;
}

// Answer the dropdown's package list (and the album photo lookup) with test data.
async function mockPackages(page, docs, photoDocs = []) {
  await page.route(/\/api\/pricing-rows\?/, (route) => route.fulfill({ json: { docs, totalDocs: docs.length } }));
  await page.route(/\/api\/photos\?.*where%5Bevent%5D|\/api\/photos\?.*where\[event\]/, (route) => route.fulfill({ json: { docs: photoDocs } }));
}

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  const errors = [];
  const watch = (p) => p.on("pageerror", (e) => errors.push(e.message));

  // What's saved, for the "kept" checks.
  let page = await ctx.newPage();
  watch(page);
  const saved = await (await page.request.get(`${API}/globals/featured-offer?depth=1`)).json();
  const savedPkg = saved.featuredPackage;
  r.lines.push(`(saved: switch ${saved.showOnHomepage}, package "${savedPkg?.title}", heading "${saved.heading}", badge "${saved.badgeLabel}")`);

  section("switch and dropdown, 1440x950");
  await open(page);
  let s = await switchState(page);
  check("switch: Show on homepage, on, Live", s.checked === "true" && s.label === "Show on homepage" && s.pill === "Live", s);
  check("it's the first field", await page.evaluate(() => {
    const all = [...document.querySelectorAll(".document-fields .field-type, .render-fields > .field-type")];
    return all[0]?.classList.contains("show-on-website");
  }));
  const opts = await dropdownOptions(page);
  check("no 'None' option", opts.length > 0 && !opts.some((o) => /^none$/i.test(o.trim())), opts);
  check("no 'Name — Name' labels", !opts.some((o) => { const [a, b] = o.split(" — "); return b && a.trim().toLowerCase() === b.trim().toLowerCase(); }), opts);
  if (savedPkg?.title) check(`saved package shows as "${savedPkg.title}"`, (await page.locator(".featured-package-field .react-select").innerText()).trim() === savedPkg.title.trim(), await page.locator(".featured-package-field .react-select").innerText());
  // Real data: Real Estate has no album.
  const realWarn = await warnings(page);
  const savedAlbum = savedPkg?.album;
  r.lines.push(`(saved package album: ${JSON.stringify(savedAlbum ?? null)})`);
  if (!savedAlbum) check("no-album warning for the saved package", realWarn.some((w) => w.includes("no album for sample photos")), realWarn);

  // Live Preview: spotlight and badge before the switch.
  const iframe = page.locator("iframe.live-preview-iframe, .live-preview-window iframe").first();
  // Opens by default, unless the signed-in user last closed it.
  if (!(await iframe.count())) await page.locator(".live-preview-toggler").click().catch(() => {});
  const hasPreview = await iframe.waitFor({ timeout: 30000 }).then(() => true, () => false);
  const frame = hasPreview ? page.frameLocator("iframe.live-preview-iframe, .live-preview-window iframe").first() : null;
  const preview = async () => frame && {
    spotlight: await frame.locator("#hot-offer").count(),
    featuredRow: await frame.locator("#offers .offer-row-featured").count(),
  };
  if (frame) {
    await frame.locator("#offers").waitFor({ timeout: 60000 });
    await page.waitForTimeout(1500);
    const p = await preview();
    check("preview (on): spotlight and featured row shown", p.spotlight === 1 && p.featuredRow === 1, p);
  } else check("Live Preview opens", false);
  await page.screenshot({ path: `${shots}/1-on.png` });

  section("switch off");
  const before = await page.evaluate(() => ({
    heading: document.querySelector("#field-heading")?.value,
    badge: document.querySelector("#field-badgeLabel")?.value,
    pkg: document.querySelector(".featured-package-field .react-select")?.innerText,
  }));
  await page.locator(".show-on-website [role='switch']").click();
  await page.waitForTimeout(800);
  s = await switchState(page);
  check("switch off: Hidden", s.checked === "false" && s.pill === "Hidden", s);
  const g = await greyed(page);
  check("package, heading and badge greyed out and inert", g.every((f) => f.found && f.inert && f.cls), g);
  await page.locator("#field-heading").click({ force: true, timeout: 3000 }).catch(() => {});
  check("heading can't be focused", !(await page.evaluate(() => document.activeElement?.id === "field-heading")));
  const after = await page.evaluate(() => ({
    heading: document.querySelector("#field-heading")?.value,
    badge: document.querySelector("#field-badgeLabel")?.value,
    pkg: document.querySelector(".featured-package-field .react-select")?.innerText,
  }));
  check("values kept", JSON.stringify(before) === JSON.stringify(after), { before, after });
  check("no warnings while off", (await warnings(page)).length === 0, await warnings(page));
  if (frame) {
    await page.waitForTimeout(2500);
    const p = await preview();
    check("preview (off): no spotlight, no featured row/badge", p.spotlight === 0 && p.featuredRow === 0, p);
  }
  await page.screenshot({ path: `${shots}/2-off.png` });

  section("switch back on");
  await page.locator(".show-on-website [role='switch']").click();
  await page.waitForTimeout(800);
  const g2 = await greyed(page);
  check("fields usable again", g2.every((f) => f.found && !f.inert && !f.cls), g2);
  if (frame) {
    await page.waitForTimeout(2500);
    const p = await preview();
    check("preview (on again): spotlight and featured row back", p.spotlight === 1 && p.featuredRow === 1, p);
  }
  await page.close();

  section("labels and warnings (mocked packages)");
  const cat = (id, name) => ({ id, name });
  // Selected package not in the list: hidden.
  page = await ctx.newPage();
  watch(page);
  await mockPackages(page, [{ id: 9001, title: "Weddings Full Day", category: cat(1, "Weddings") }]);
  await open(page);
  const hiddenOpts = await dropdownOptions(page);
  check("category shown when different", hiddenOpts.includes("Weddings Full Day — Weddings"), hiddenOpts);
  const sel = (await page.locator(".featured-package-field .react-select").innerText()).trim();
  check("hidden saved package keeps its name, marked hidden", savedPkg ? sel === `${savedPkg.title} (hidden on your site)` : true, sel);
  let w = await warnings(page);
  check("hidden warning", w.length === 1 && w[0].includes("hidden on your site or in the Trash, so the spotlight won't show"), w);
  await page.screenshot({ path: `${shots}/3-hidden.png` });
  await page.close();

  // Saved package available, with an album that has photos: no warning.
  const pkg = (album) => ({ id: savedPkg?.id ?? 9, title: savedPkg?.title ?? "Real Estate", category: cat(5, savedPkg?.category?.name ?? "Real Estate"), album });
  page = await ctx.newPage();
  watch(page);
  await mockPackages(page, [pkg({ id: 77, published: true, category: 5 })], [{ id: 1, event: 77 }]);
  await open(page);
  w = await warnings(page);
  check("album with photos: no warning", w.length === 0, w);
  await page.close();

  // Same album, no photos.
  page = await ctx.newPage();
  watch(page);
  await mockPackages(page, [pkg({ id: 77, published: true, category: 5 })], []);
  await open(page);
  w = await warnings(page);
  check("empty album warning", w.length === 1 && w[0].includes("album has no photos yet"), w);
  await page.close();

  // Album hidden, or in another category: treated as no album.
  for (const [label, album] of [["hidden album", { id: 77, published: false, category: 5 }], ["album from another category", { id: 77, published: true, category: 6 }]]) {
    page = await ctx.newPage();
    watch(page);
    await mockPackages(page, [pkg(album)], [{ id: 1, event: 77 }]);
    await open(page);
    w = await warnings(page);
    check(`${label}: no-photos warning`, w.length === 1 && w[0].includes("no album for sample photos"), w);
    await page.close();
  }

  section("phone 390x844");
  const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  page = await phone.ctx.newPage();
  watch(page);
  await open(page);
  s = await switchState(page);
  check("switch shown", s.checked === "true", s);
  await page.locator(".featured-package-field").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/4-phone.png` });
  await checkNoSidewaysScroll(page, r, "no sideways scroll");
  await page.close();

  section("homepage (saved: on)");
  page = await ctx.newPage();
  watch(page);
  await page.goto(`${BASE}/`, { timeout: 120000 });
  await page.locator("#offers").waitFor({ timeout: 60000 });
  check("spotlight shown", (await page.locator("#hot-offer").count()) === 1);
  check("featured row has the badge", (await page.locator("#offers .offer-row-featured").count()) === 1);
  await page.close();

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = [...guard.log, ...phone.guard.log].filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
