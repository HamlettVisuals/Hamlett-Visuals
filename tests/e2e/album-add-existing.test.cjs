// "Add existing photos": the library grouped category → album, this album's photos not pickable, picking moves photos from another album, saves in pick order, a failure part-way, waits during uploads. Albums 16 and 15.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e album-add-existing` (see README.md).
const { launchBrowser, newContext, report, outDir, fixtures, ADMIN, API } = require("./lib/harness.cjs");

const r = report("album-add-existing");
const { check } = r;
const shots = outDir("album-add-existing");
const ALBUM = 16;
const OTHER = 15;

(async () => {
  const browser = await launchBrowser();
  const fx = await fixtures();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const get = async (url) => (await page.request.get(url)).json();
  const all = (await get(`${API}/photos?pagination=false&depth=0`)).docs;
  const here = all.filter((p) => p.event === ALBUM);
  const cars = all.filter((p) => p.event === OTHER).sort((a, b) => (a.albumOrder < b.albumOrder ? -1 : 1));
  const loose = all.filter((p) => p.event == null);
  const label = (p) => p.alt?.trim() || p.filename;

  const patches = [];
  await page.route(/\/hv-studio\/api\/photos\/\d+$/, async (route) => {
    const req = route.request();
    if (req.method() !== "PATCH") return route.fallback();
    const id = Number(req.url().split("/").pop());
    patches.push({ id, body: JSON.parse(req.postData()) });
    await new Promise((r) => setTimeout(r, 300));
    if (globalThis.failOn === id) return route.fulfill({ status: 403, json: { errors: [{ message: "You are not allowed to perform this action." }] } });
    await route.fulfill({ json: { doc: { id }, message: "Updated successfully." } });
  });

  await page.goto(`${ADMIN}/collections/events/${ALBUM}`, { timeout: 120000 });
  await page.locator(".album-photos__tile").first().waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Add existing photos" }).click();
  const drawer = page.locator(".add-photos");
  await drawer.locator(".add-photos__photo").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/7-drawer.png` });

  const titles = await drawer.locator(".grouped-list__title").allInnerTexts();
  check("grouped category → album, plus Not in an album", titles.includes("Test") && titles.includes("Vacation Test") && titles.includes("Cars Test") && titles.includes("Not in an album"), titles.join(" | "));
  const vacationHead = drawer.locator(".grouped-list__head", { hasText: "Vacation Test" });
  const carsHead = drawer.locator(".grouped-list__head", { hasText: "Cars Test" });
  check("this album marked", (await vacationHead.innerText()).includes("This album"));
  check("other album says picking moves them", (await carsHead.innerText()).includes("Picking moves them here"));
  const hereTiles = drawer.locator(".add-photos__photo--here");
  check("this album's photos shown but not pickable", (await hereTiles.count()) === here.length && (await hereTiles.first().isDisabled()), `${await hereTiles.count()} of ${here.length}`);
  check("'Other' (CRM) category not listed", !titles.includes("Other"));

  const src = (p) => p.sizes?.thumbnail?.url || p.url;
  const tile = (p) => drawer.locator(".add-photos__photo").filter({ has: page.locator(`img[src="${src(p)}"]`) });
  // Pick: cars[0], loose[0], cars[1]; then unpick loose[0] and pick it again (goes last).
  await tile(cars[0]).click();
  await tile(loose[0]).click();
  await tile(cars[1]).click();
  const summary = drawer.locator(".add-photos__summary");
  check("footer counts what moves out of where", (await summary.innerText()) === "3 picked · 2 will move out of “Cars Test”", await summary.innerText());
  await tile(loose[0]).click();
  check("unpicking renumbers", (await tile(cars[1]).locator(".add-photos__check").innerText()) === "2");
  await tile(loose[0]).click();
  check("re-picked goes last", (await tile(loose[0]).locator(".add-photos__check").innerText()) === "3");
  check("Add button counts", (await page.getByRole("button", { name: "Add 3 photos" }).count()) === 1);
  await page.screenshot({ path: `${shots}/7-picked.png` });

  // Add: one PATCH each, in the order picked, event = this album.
  await page.getByRole("button", { name: "Add 3 photos" }).click();
  for (let i = 0; i < 40 && patches.length < 3; i++) await page.waitForTimeout(200);
  await page.waitForTimeout(1500);
  const expectOrder = [cars[1].id, cars[0].id, loose[0].id].sort(() => 0);
  check(
    "one save per photo, in picked order, into this album",
    JSON.stringify(patches.map((p) => p.id)) === JSON.stringify([cars[0].id, cars[1].id, loose[0].id]) && patches.every((p) => JSON.stringify(p.body) === JSON.stringify({ event: ALBUM })),
    JSON.stringify(patches),
  );
  check("drawer closes after adding", !(await drawer.isVisible().catch(() => false)));
  void expectOrder;

  // Failure part-way: the second save refused.
  patches.length = 0;
  await page.getByRole("button", { name: "Add existing photos" }).click();
  await drawer.locator(".add-photos__photo").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  check("picks cleared on reopen", (await drawer.locator(".add-photos__photo--picked").count()) === 0);
  await tile(cars[2]).click();
  await tile(cars[3]).click();
  globalThis.failOn = cars[3].id;
  await page.getByRole("button", { name: "Add 2 photos" }).click();
  await drawer.locator(".add-photos__error").waitFor({ timeout: 15000 });
  const err = await drawer.locator(".add-photos__error").innerText();
  check("failure says what happened, keeps the rest picked", err.startsWith("1 of 2 added, then the photo") && err.includes("not allowed") && (await drawer.locator(".add-photos__photo--picked").count()) === 1, err);
  await page.screenshot({ path: `${shots}/7-failure.png` });
  globalThis.failOn = null;
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(600);
  check("Cancel closes", !(await drawer.isVisible().catch(() => false)));
  // Escape closes, and it reopens after.
  await page.getByRole("button", { name: "Add existing photos" }).click();
  await drawer.locator(".add-photos__photo").first().waitFor({ timeout: 30000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Add existing photos" }).click();
  await drawer.locator(".add-photos__photo").first().waitFor({ timeout: 30000 });
  check("reopens after Escape", true);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);

  // Waits while uploads run.
  await page.route("**/storage-s3-generate-signed-url", (route) => route.fulfill({ json: { url: "https://fake-r2.invalid/p/x.jpg", filename: "x.jpg", docPrefix: "photos" } }));
  await page.route("https://fake-r2.invalid/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT", "access-control-allow-headers": "*" } });
    await new Promise((r) => setTimeout(r, 4000));
    await route.fulfill({ status: 403, headers: { "access-control-allow-origin": "*" }, body: "" });
  });
  await page.locator(".album-photos__file-input").setInputFiles(fx.testA);
  await page.waitForTimeout(500);
  check("Add existing photos waits during uploads", await page.getByRole("button", { name: "Add existing photos" }).isDisabled());
  await page.locator(".album-photos__upload--error").waitFor({ timeout: 20000 });
  check("and comes back after", !(await page.getByRole("button", { name: "Add existing photos" }).isDisabled()));

  // Phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Add existing photos" }).click();
  await drawer.locator(".add-photos__photo").first().waitFor({ timeout: 30000 });
  await tile(cars[0]).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/7-phone.png` });
  const overflow = await page.evaluate(() => {
    const d = document.querySelector(".add-photos .drawer__content") || document.querySelector(".add-photos");
    return d ? d.scrollWidth - d.clientWidth : -1;
  });
  check("drawer has no sideways scroll at 390px", overflow <= 0, String(overflow));

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/fake-r2|storage-s3/.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
