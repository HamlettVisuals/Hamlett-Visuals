// Unused photos on Categories & Albums: the real list, closed to start, loads when opened, #unused-photos, and (with 150 sample photos) search, sort, show more, select, Move to Trash.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e unused-photos` (see README.md).
const { launchBrowser, newContext, report, outDir, ADMIN, API } = require("./lib/harness.cjs");

const r = report("unused-photos");
const { check } = r;
const shots = outDir("unused-photos");


(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1. The real list (a read): only HV.png (#33) is unused today.
  const real = await (await page.request.get(`${API}/photos/unused`)).json();
  check("real endpoint: only HV.png is unused", real.photos?.length === 1 && real.photos[0].id === 33 && /400x400/.test(real.photos[0].thumbnail), JSON.stringify(real.photos?.map((p) => [p.id, p.filename, p.thumbnail])));
  const anon = await browser.newContext().then((c) => c.request.get(`${API}/photos/unused`));
  check("endpoint refuses signed-out requests", anon.status() === 401);

  // 2. The section with the real data.
  await page.goto(`${ADMIN}/portfolio`, { timeout: 120000 });
  const section = page.locator("#unused-photos");
  await section.waitFor({ timeout: 60000 });
  check("section is closed to start, count in header", !(await section.locator(".unused-photos__body").count()) && (await section.locator(".portfolio__count").innerText()) === "1");
  let listLoads = 0;
  page.on("request", (r) => r.url().endsWith("/photos/unused") && listLoads++);
  check("photos not loaded until opened", listLoads === 0);
  await section.locator(".unused-photos__toggle").click();
  await section.locator(".unused-photos__photo").first().waitFor({ timeout: 20000 });
  check("opening loads them", listLoads === 1 && (await section.locator(".unused-photos__photo").count()) === 1);
  check("tile shows name and upload date", /Hamlett Visuals Logo[\s\S]*\d{1,2} \w{3,4} 20\d\d/.test(await section.locator(".unused-photos__photo").innerText()), await section.locator(".unused-photos__photo").innerText());
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/9-real.png` });

  // 3. Many photos (the list faked, it's a read): search, sort, show more.
  const fake = Array.from({ length: 150 }, (_, i) => ({
    id: 5000 + i,
    alt: i % 3 === 0 ? `Photo from Smith Wedding ${i}` : i % 3 === 1 ? `Beach ${i}` : null,
    filename: `IMG_${String(1000 + i)}.jpg`,
    caption: i === 7 ? "Golden hour at the pier" : null,
    thumbnail: real.photos[0].thumbnail,
    createdAt: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString(),
  }));
  await page.route("**/hv-studio/api/photos/unused", (route) => route.fulfill({ json: { photos: fake } }));
  let trashCalls = [];
  await page.route("**/hv-studio/api/photos/trash-unused", async (route) => {
    const ids = JSON.parse(route.request().postData()).ids;
    trashCalls.push(ids);
    await route.fulfill({ json: { trashed: ids.slice(1), skipped: ids.slice(0, 1) } });
  });
  await page.goto(`${ADMIN}/portfolio#unused-photos`, { timeout: 120000 });
  await section.locator(".unused-photos__photo").first().waitFor({ timeout: 20000 });
  check("#unused-photos opens the section by itself", (await section.locator(".unused-photos__body").count()) === 1);
  const local = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const byTime = fake.toSorted((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const names = async () => section.locator(".unused-photos__name").allInnerTexts();
  const dates = async () => section.locator(".unused-photos__date").allInnerTexts();
  check("60 shown at first", (await section.locator(".unused-photos__photo").count()) === 60);
  check("newest first by default (local date)", (await dates())[0] === local(byTime.at(-1).createdAt), (await dates())[0]);
  check("'Show more' says what's left", (await section.locator(".unused-photos__more").innerText()).includes("Show 60 more · 90 left"), await section.locator(".unused-photos__more").innerText());
  await section.getByRole("button", { name: /Show 60 more/ }).click();
  await section.getByRole("button", { name: /Show 30 more/ }).click();
  check("show more reaches all 150", (await section.locator(".unused-photos__photo").count()) === 150 && !(await section.locator(".unused-photos__more").count()));
  await section.locator("select").selectOption("oldest");
  check("oldest first", (await dates())[0] === local(byTime[0].createdAt), (await dates())[0]);
  await section.locator("select").selectOption("name");
  const n = await names();
  check("name sort (alt text, else file name)", n[0] === "Beach 1" && n.at(-1) === "Photo from Smith Wedding 99" && n.includes("IMG_1002.jpg"), `${n[0]} … ${n.at(-1)}`);
  const search = section.locator(".unused-photos__search");
  await search.fill("smith wedding");
  check("search matches alt text (album name), case-insensitive", (await section.locator(".unused-photos__photo").count()) === 50);
  await search.fill("golden hour");
  check("search matches caption", (await section.locator(".unused-photos__photo").count()) === 1);
  await search.fill("IMG_1149");
  check("search matches file name", (await section.locator(".unused-photos__photo").count()) === 1);
  await search.fill("zzz");
  check("no match says so", (await section.locator(".portfolio__empty").innerText()).includes("No unused photo matches"));
  await search.fill("");
  await section.locator("select").selectOption("newest");

  // 4. Pick, select all shown, move to Trash (faked; one reported as skipped).
  const tiles = section.locator(".unused-photos__check");
  await tiles.nth(0).click();
  await tiles.nth(2).click();
  check("picking shows the bar", (await section.locator(".unused-photos__bar").innerText()).includes("2 selected"));
  await section.locator(".unused-photos__select-all input").check();
  check("select all shown picks the 60 showing", (await section.locator(".unused-photos__bar").innerText()).includes("60 selected"));
  await section.locator(".unused-photos__select-all input").uncheck();
  check("unselect all", (await section.locator(".unused-photos__bar").count()) === 0);
  await tiles.nth(0).click();
  await tiles.nth(1).click();
  await tiles.nth(2).click();
  await page.screenshot({ path: `${shots}/9-picked.png` });
  await section.getByRole("button", { name: "Move 3 to Trash" }).click();
  const modal = page.locator(".confirmation-modal").first();
  await modal.waitFor({ timeout: 10000 });
  check("asks first", (await modal.innerText()).includes("Move 3 photos to the Trash?"));
  await page.screenshot({ path: `${shots}/9-confirm.png` });
  await page.getByRole("button", { name: "Move to Trash" }).last().click();
  await page.waitForTimeout(2000);
  const newest = fake.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3).map((p) => p.id);
  check("sends the 3 picked ids", JSON.stringify(trashCalls[0]) === JSON.stringify(newest), JSON.stringify(trashCalls));
  const toasts = await page.locator("[data-sonner-toast]").allInnerTexts();
  check("says how many moved and how many were left alone", toasts.some((t) => t.includes("2 photos moved to the Trash")) && toasts.some((t) => t.includes("1 photo was left alone")), toasts.join(" | "));
  check("selection cleared after", (await section.locator(".unused-photos__bar").count()) === 0);

  // 5. Phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  await tiles.nth(0).click();
  await section.locator(".unused-photos__tools").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/9-phone.png` });
  const wide = await section.evaluate((el) => el.scrollWidth - el.clientWidth);
  check("section fits at 390px", wide <= 0, String(wide));

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/payload-preferences/.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
