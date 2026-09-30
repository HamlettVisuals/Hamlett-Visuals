// Unused photos: open a photo in its edit drawer, Add to album… (one or several, in pick order), a failure part-way, Move to Trash for one photo; no Category field on the photo.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e unused-photos-actions` (see README.md).
const { launchBrowser, newContext, report, outDir, ADMIN, API } = require("./lib/harness.cjs");

const r = report("unused-photos-actions");
const { check } = r;
const shots = outDir("unused-photos-actions");


(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Sample unused photos: real ids (33 is really unused; the others stand in).
  const real = (await (await page.request.get(`${API}/photos?pagination=false&depth=0`)).json()).docs;
  const pick = [33, 36, 37, 38, 41].map((id) => real.find((p) => p.id === id));
  let list = pick.map((p, i) => ({
    id: p.id,
    alt: p.alt,
    filename: p.filename,
    caption: null,
    thumbnail: p.sizes?.thumbnail?.url ?? p.url,
    createdAt: new Date(Date.UTC(2026, 8, 20 + i)).toISOString(),
  }));
  await page.route("**/hv-studio/api/photos/unused", (route) => route.fulfill({ json: { photos: list } }));

  // Writes: photo saves (drawer form, add to album) and the trash endpoint.
  const patches = [];
  let failOn = null;
  await page.route(/\/hv-studio\/api\/photos\/\d+(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() !== "PATCH") return route.fallback();
    const id = Number(new URL(req.url()).pathname.split("/").pop());
    const type = req.headers()["content-type"] || "";
    let body;
    if (type.includes("application/json")) body = JSON.parse(req.postData());
    else {
      const m = (req.postDataBuffer()?.toString() ?? "").match(/name="_payload"\r\n\r\n([\s\S]*?)\r\n--/);
      body = m ? JSON.parse(m[1]) : {};
    }
    patches.push({ id, body });
    if (failOn === id) return route.fulfill({ status: 403, json: { errors: [{ message: "You are not allowed to perform this action." }] } });
    // A realistic answer: the saved photo with the change.
    const doc = await (await page.request.get(`${API}/photos/${id}?depth=0`)).json();
    await route.fulfill({ json: { doc: { ...doc, ...body }, message: "Photo successfully updated." } });
  });
  const trashCalls = [];
  await page.route("**/hv-studio/api/photos/trash-unused", async (route) => {
    const ids = JSON.parse(route.request().postData()).ids;
    trashCalls.push(ids);
    await route.fulfill({ json: { trashed: ids, skipped: [] } });
  });

  await page.goto(`${ADMIN}/portfolio#unused-photos`, { timeout: 120000 });
  const section = page.locator("#unused-photos");
  await section.locator(".unused-photos__tile").first().waitFor({ timeout: 60000 }).catch(async (e) => {
    await page.screenshot({ path: `${shots}/12-fail.png` });
    console.log("errors:", errors.join(" || "), "| section:", (await section.innerText().catch(() => "?")).slice(0, 300));
    throw e;
  });
  const tile = (id) => section.locator(".unused-photos__tile").filter({ has: page.locator(`button[aria-label="Select ${list.find((p) => p.id === id).alt}"]`) });

  // 1. The ring picks, the photo doesn't.
  await tile(33).locator(".unused-photos__check").click();
  check("ring picks the photo", (await tile(33).locator(".unused-photos__check").getAttribute("aria-checked")) === "true" && (await page.locator(".drawer__content").count()) === 0);
  await tile(33).locator(".unused-photos__check").click();

  // 2. The photo opens its edit form in the drawer; no category field.
  await tile(33).locator(".unused-photos__photo").click();
  const drawer = page.locator(".drawer__content").last();
  await drawer.waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  check("clicking the photo opens its edit drawer", (await drawer.locator("#field-alt").count()) === 1);
  check("photo not picked by opening it", (await tile(33).locator(".unused-photos__check").getAttribute("aria-checked")) === "false");
  check("drawer has no Category field", !(await drawer.locator("#field-category").isVisible().catch(() => false)) && !(await drawer.innerText()).includes("Only set this if the photo isn't part of") && !/Category/.test(await drawer.innerText()));
  await page.screenshot({ path: `${shots}/12-drawer.png` });
  // Save a new alt text: the tile shows it afterwards.
  await drawer.locator("#field-alt").fill("Hamlett Visuals logo, yellow");
  list = list.map((p) => (p.id === 33 ? { ...p, alt: "Hamlett Visuals logo, yellow" } : p));
  await drawer.locator("#action-save").click();
  await page.waitForTimeout(2500);
  const saved = patches.find((p) => p.id === 33);
  check("drawer Save sends the new alt text", saved?.body.alt === "Hamlett Visuals logo, yellow", JSON.stringify(saved?.body).slice(0, 120));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);
  check("tile shows the saved change", (await section.locator(".unused-photos__name").allInnerTexts()).includes("Hamlett Visuals logo, yellow"));

  // 3. One photo: ⋯ → Add to album… → search → pick.
  patches.length = 0;
  await tile(36).locator(".unused-photos__menu-button").click();
  await page.screenshot({ path: `${shots}/12-menu.png` });
  await page.getByRole("button", { name: "Add to album…" }).click();
  const picker = page.locator(".album-picker");
  await picker.locator(".album-picker__album").first().waitFor({ timeout: 30000 });
  check("picker title", (await picker.innerText()).includes("Add the photo to an album"));
  const groups = await picker.locator(".grouped-list__title").allInnerTexts();
  check("albums grouped by category, in her order; no 'Other'", JSON.stringify(groups) === JSON.stringify(["Motorsports", "Test"]), groups.join(" | "));
  const inTest = await picker.locator(".grouped-list__section").filter({ has: page.locator(".grouped-list__title", { hasText: /^Test$/ }) }).locator(".album-picker__title").allInnerTexts();
  check("albums in her order within a category (as on Categories & Albums)", JSON.stringify(inTest) === JSON.stringify(["Maisy Test", "Vacation Test", "Cars Test"]), inTest.join(" | "));
  await page.screenshot({ path: `${shots}/12-picker.png` });
  await picker.locator(".album-picker__search").fill("vac");
  check("search narrows to matching albums", JSON.stringify(await picker.locator(".album-picker__title").allInnerTexts()) === JSON.stringify(["Vacation Test"]));
  list = list.filter((p) => p.id !== 36);
  await picker.locator(".album-picker__album", { hasText: "Vacation Test" }).click();
  await page.waitForTimeout(2000);
  check("one save: the photo into that album", JSON.stringify(patches) === JSON.stringify([{ id: 36, body: { event: 16 } }]), JSON.stringify(patches));
  const toast1 = await page.locator("[data-sonner-toast]").allInnerTexts();
  check("toast: 1 photo added to Vacation Test", toast1.some((t) => t.includes("1 photo added to Vacation Test.")), toast1.join(" | "));
  check("it leaves the section", !(await section.locator(".unused-photos__tile").filter({ has: page.locator('button[aria-label*="Shelby Test Bay"]') }).count()));

  // 4. Several: pick 41, 33, 38 (in that order) → Add 3 to album… → Cars Test.
  patches.length = 0;
  for (const id of [41, 33, 38]) await tile(id).locator(".unused-photos__check").click();
  check("bar offers Add 3 to album…", (await section.getByRole("button", { name: "Add 3 to album…" }).count()) === 1);
  await page.screenshot({ path: `${shots}/12-picked.png` });
  await section.getByRole("button", { name: "Add 3 to album…" }).click();
  await picker.locator(".album-picker__album").first().waitFor({ timeout: 30000 });
  check("picker title counts them", (await picker.innerText()).includes("Add 3 photos to an album"));
  list = list.filter((p) => ![41, 33, 38].includes(p.id));
  await picker.locator(".album-picker__album", { hasText: "Cars Test" }).click();
  await page.waitForTimeout(2500);
  check("one save each, in the order picked", JSON.stringify(patches.map((p) => p.id)) === "[41,33,38]" && patches.every((p) => p.body.event === 15), JSON.stringify(patches));
  const toast2 = await page.locator("[data-sonner-toast]").allInnerTexts();
  check("toast: 3 photos added to Cars Test", toast2.some((t) => t.includes("3 photos added to Cars Test.")), toast2.join(" | "));
  check("selection cleared", (await section.locator(".unused-photos__bar").count()) === 0);

  // 5. A failure part-way says so.
  patches.length = 0;
  list = pick.slice(0, 3).map((p, i) => ({ id: p.id, alt: p.alt, filename: p.filename, caption: null, thumbnail: p.sizes?.thumbnail?.url ?? p.url, createdAt: new Date(Date.UTC(2026, 8, 20 + i)).toISOString() }));
  await page.reload();
  await section.locator(".unused-photos__tile").first().waitFor({ timeout: 60000 });
  for (const id of [33, 36]) await tile(id).locator(".unused-photos__check").click();
  failOn = 36;
  await section.getByRole("button", { name: "Add 2 to album…" }).click();
  await picker.locator(".album-picker__album", { hasText: "Maisy Test" }).click();
  await page.waitForTimeout(2500);
  const toast3 = await page.locator("[data-sonner-toast]").allInnerTexts();
  check("failure: says how many were added and which one wasn't", toast3.some((t) => t.includes("1 photo added to Maisy Test, then") && t.includes("couldn't be added")), toast3.join(" | "));
  check("the one not added stays picked", (await tile(36).locator(".unused-photos__check").getAttribute("aria-checked")) === "true");
  failOn = null;

  // 6. One photo: ⋯ → Move to Trash.
  await tile(37).locator(".unused-photos__menu-button").click();
  await page.getByRole("button", { name: "Move to Trash" }).click();
  const modal = page.locator(".confirmation-modal").first();
  await modal.waitFor({ timeout: 10000 });
  check("single trash asks about this photo", (await modal.innerText()).includes("Move this photo to the Trash?"));
  await page.getByRole("button", { name: "Move to Trash" }).last().click();
  await page.waitForTimeout(1500);
  check("single trash sends only that photo (selection untouched)", JSON.stringify(trashCalls.at(-1)) === "[37]" && (await tile(36).locator(".unused-photos__check").getAttribute("aria-checked")) === "true", JSON.stringify(trashCalls));

  // 7. Keyboard: the ring and the photo are separate controls.
  await tile(33).locator(".unused-photos__photo").focus();
  await page.keyboard.press("Tab");
  check("Tab from the photo reaches its ring", await tile(33).locator(".unused-photos__check").evaluate((el) => el === document.activeElement));
  await page.keyboard.press("Space");
  check("Space on the ring picks it", (await tile(33).locator(".unused-photos__check").getAttribute("aria-checked")) === "true");

  // 8. The photo's own page: no Category field either.
  await page.goto(`${ADMIN}/collections/photos/33`, { timeout: 120000 });
  await page.locator("#field-alt").waitFor({ timeout: 60000 });
  check("photo page has no Category field", !(await page.locator("#field-category").isVisible().catch(() => false)) && !/Category/.test(await page.locator(".document-fields, form").first().innerText()));

  // 9. Phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${ADMIN}/portfolio#unused-photos`, { timeout: 120000 });
  await section.locator(".unused-photos__tile").first().waitFor({ timeout: 60000 });
  await tile(33).locator(".unused-photos__check").click();
  await section.locator(".unused-photos__grid").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/12-phone.png` });
  const wide = await section.evaluate((el) => el.scrollWidth - el.clientWidth);
  check("section fits at 390px", wide <= 0, String(wide));

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
