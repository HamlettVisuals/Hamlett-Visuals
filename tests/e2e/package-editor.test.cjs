// The package editor: "Show on website" first, then a note saying whether
// it's the featured package (link to Featured Offer), then the sections
// "What visitors read" (title, price prefix, price, summary, features) and
// "Where it links" (category, album); its own page description; feature
// text wraps instead of being cut off on a phone, and stays one line of
// text. Spotlight states the live data doesn't have come from a mocked
// Featured Offer reply. Nothing is saved.
//
// Live Preview opening by default (livePreview.openByDefault) can't be
// checked here: Payload only applies it to someone with no saved choice,
// and the test account has one.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e package-editor` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN, API } = require("./lib/harness.cjs");

const r = report("package-editor");
const { check, section } = r;
const shots = outDir("package-editor");

async function openEditor(page, id) {
  await page.goto(`${ADMIN}/collections/pricing-rows/${id}`, { timeout: 120000 });
  await page.locator("#field-title").waitFor({ timeout: 90000 });
  await page.waitForTimeout(2500);
}

const noteText = (page) => page.locator(".package-featured-note").innerText().catch(() => "");

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  const errors = [];
  const watch = (p) => p.on("pageerror", (e) => errors.push(e.message));
  let page = await ctx.newPage();
  watch(page);
  const { docs } = await (await page.request.get(`${API}/pricing-rows?depth=0&limit=100&sort=_order`)).json();
  const featured = await (await page.request.get(`${API}/globals/featured-offer?depth=0`)).json();
  const pkg = docs.find((d) => d.id === featured.featuredPackage) ?? docs[0];
  r.lines.push(`(package ${pkg.id} "${pkg.title}"; spotlight package ${featured.featuredPackage}, switch ${featured.showOnHomepage})`);

  section("layout, 1440x950");
  await openEditor(page, pkg.id);
  const layout = await page.evaluate(() => {
    const top = [...document.querySelectorAll(".render-fields")][0];
    const order = [...top.children].map((el) =>
      el.classList.contains("show-on-website") ? "switch"
        : el.classList.contains("package-featured-note") ? "note"
        : el.querySelector(":scope .collapsible__toggle, .collapsible__title") ? `section: ${el.querySelector(".row-label")?.textContent.trim()}`
        : el.className.split(" ")[0]).filter(Boolean);
    const sections = [...document.querySelectorAll(".collapsible")].map((c) => ({
      title: c.querySelector(".row-label")?.textContent.trim(),
      fields: ["title", "priceLead", "priceAmount", "summary", "features", "category", "album"].filter((n) =>
        c.querySelector(`#field-${n}, [id^="field-${n}"]`)),
    }));
    return { order, sections };
  });
  check("order: switch, featured note, What visitors read, Where it links",
    JSON.stringify(layout.order) === JSON.stringify(["switch", "note", "section: What visitors read", "section: Where it links"]), layout.order);
  check("What visitors read: title, price prefix, price, summary, features",
    JSON.stringify(layout.sections[0]?.fields) === JSON.stringify(["title", "priceLead", "priceAmount", "summary", "features"]), layout.sections[0]);
  check("Where it links: category, album", JSON.stringify(layout.sections[1]?.fields) === JSON.stringify(["category", "album"]), layout.sections[1]);
  const description = await page.locator(".categories-list-intro__text").innerText().catch(() => "");
  check("edit page has its own description", description.startsWith("One package in the Offers & pricing section") && !description.includes("Drag"), description);
  const albumHelp = await page.locator("#field-album").locator("xpath=ancestor::div[contains(@class,'field-type')][1]").innerText().catch(() => "");
  check("album says its photos only show while featured", albumHelp.includes("only while it's the featured package"), albumHelp.slice(-200));

  section("featured note");
  const isFeatured = featured.featuredPackage === pkg.id;
  let note = await noteText(page);
  if (isFeatured && featured.showOnHomepage !== false) {
    check("featured: tag and 'In Popular right now'", note.includes("Featured") && note.includes("In ‘Popular right now’ on your homepage"), note);
  } else check("not featured: says so", note.startsWith("Not featured"), note);
  const noteLink = page.locator(".package-featured-note a");
  check("links to Featured Offer", (await noteLink.getAttribute("href")) === "/hv-studio/globals/featured-offer");
  await page.screenshot({ path: `${shots}/1-editor.png` });
  if (isFeatured && featured.showOnHomepage !== false) {
    // Unsaved: switch the package off.
    await page.locator(".show-on-website [role='switch']").click();
    await page.waitForTimeout(600);
    note = await noteText(page);
    check("switched off (unsaved): says the spotlight won't show", note.includes("hidden from your site, so the spotlight won’t show"), note);
    await page.locator(".show-on-website [role='switch']").click();
  }
  await page.close();
  for (const [label, body, want] of [
    ["spotlight switched off", { ...featured, featuredPackage: pkg.id, showOnHomepage: false }, "spotlight is turned off"],
    ["another package featured", { ...featured, featuredPackage: 999999, showOnHomepage: true }, "Not featured."],
    ["nothing picked", { ...featured, featuredPackage: null, showOnHomepage: true }, "Not featured."],
  ]) {
    page = await ctx.newPage();
    watch(page);
    await page.route(/\/api\/globals\/featured-offer\?depth=0/, (route) => route.fulfill({ json: body }));
    await openEditor(page, pkg.id);
    note = await noteText(page);
    check(`${label}: "${want}"`, note.includes(want), note);
    await page.close();
  }

  section("list page keeps the list description");
  page = await ctx.newPage();
  watch(page);
  await page.goto(`${ADMIN}/collections/pricing-rows`, { timeout: 120000 });
  await page.locator(".categories-list-intro__text").waitFor({ timeout: 60000 });
  check("list: 'Drag to set their order' and + Add package",
    (await page.locator(".categories-list-intro__text").innerText()).includes("Drag to set their order") && (await page.locator(".categories-list-intro__add").count()) === 1);
  await page.close();

  section("features on a phone, 390x844");
  const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  page = await phone.ctx.newPage();
  watch(page);
  await openEditor(page, pkg.id);
  await page.locator(".nav-links--features").scrollIntoViewIfNeeded();
  const boxes = await page.locator(".nav-links--features textarea").evaluateAll((tas) => tas.map((ta) => ({
    text: ta.value, rows: Math.round(ta.clientHeight), cut: ta.scrollHeight > ta.clientHeight + 1, max: ta.maxLength,
    lines: Math.round((ta.clientHeight - parseFloat(getComputedStyle(ta).paddingTop) - parseFloat(getComputedStyle(ta).paddingBottom)) / parseFloat(getComputedStyle(ta).lineHeight)),
  })));
  check("features are wrapping text boxes", boxes.length === (pkg.features?.length ?? 0) && boxes.length > 0, boxes);
  check("no feature text cut off", boxes.every((b) => !b.cut), boxes);
  check("long features wrap, short ones stay one line", boxes.some((b) => b.lines >= 2) ? boxes.filter((b) => b.text.length < 20).every((b) => b.lines === 1) : true, boxes);
  check("character limit kept", boxes.every((b) => b.max === 60), boxes.map((b) => b.max));
  await page.locator(".nav-links--features").screenshot({ path: `${shots}/2-features-phone.png` });
  // Typing: Enter adds no line break; a pasted break becomes a space.
  const first = page.locator(".nav-links--features textarea").first();
  const original = await first.inputValue();
  await first.click();
  await first.press("End");
  await first.press("Enter");
  await page.waitForTimeout(300);
  check("Enter adds no line break", (await first.inputValue()) === original, JSON.stringify(await first.inputValue()));
  await first.fill("Two\nlines");
  await page.waitForTimeout(300);
  check("pasted line break becomes a space", (await first.inputValue()) === "Two lines", JSON.stringify(await first.inputValue()));
  await first.fill(original);
  await checkNoSidewaysScroll(page, r, "no sideways scroll");
  await page.screenshot({ path: `${shots}/3-phone.png`, fullPage: true });
  await page.close();

  section("other link lists keep one-line inputs");
  page = await ctx.newPage();
  watch(page);
  await page.goto(`${ADMIN}/globals/header-nav`, { timeout: 120000 });
  await page.locator(".nav-links__row").first().waitFor({ timeout: 60000 });
  check("Header/Nav rows: inputs, no text boxes", (await page.locator(".nav-links__row textarea").count()) === 0 && (await page.locator(".nav-links__row input").count()) > 0);
  await page.close();

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = [...guard.log, ...phone.guard.log].filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
