// The album page's photo grid: order, cover, drag and keyboard reorder, the photo menu (cover, edit drawer, remove, delete with a usage warning), a failed save, phone width. Album 16 "Vacation Test".
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e album-grid` (see README.md).
const { launchBrowser, newContext, report, outDir, ADMIN, API } = require("./lib/harness.cjs");

const r = report("album-grid");
const { check, asExpected, known } = r;
const shots = outDir("album-grid");
const ALBUM = 16;
const FORCED_409 = /status of 409 \(Conflict\)/;

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // What's saved, straight from the API (a read).
  const api = await page.request.get(`${API}/photos?where[event][equals]=${ALBUM}&pagination=false&depth=0`);
  const saved = (await api.json()).docs;
  const cmp = (a, b) => {
    if (!a.albumOrder || !b.albumOrder) {
      if (a.albumOrder) return -1;
      if (b.albumOrder) return 1;
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    }
    return a.albumOrder < b.albumOrder ? -1 : a.albumOrder > b.albumOrder ? 1 : 0;
  };
  const expected = saved.toSorted(cmp).map((p) => p.id);

  await page.goto(`${ADMIN}/collections/events/${ALBUM}`, { timeout: 120000 });
  const tiles = page.locator(".album-photos__tile");
  await tiles.first().waitFor({ timeout: 60000 });
  const shownIds = async () =>
    page.$$eval(".album-photos__handle", (els) => els.map((el) => el.getAttribute("aria-label")));
  check("grid shows every photo", (await tiles.count()) === expected.length, `${await tiles.count()} tiles, ${expected.length} saved`);
  const altById = new Map(saved.map((p) => [p.id, p.alt || p.filename]));
  const labels = await shownIds();
  check(
    "grid is in her order",
    labels.every((l, i) => l === `Drag to reorder ${altById.get(expected[i])}`),
    labels.join(" | "),
  );
  check("first photo marked Cover (only it)", (await page.locator(".album-photos__cover").count()) === 1 && (await tiles.first().locator(".album-photos__cover").count()) === 1);
  check("count badge", (await page.locator(".album-photos__count").innerText()) === String(expected.length));
  await page.locator(".album-photos").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/5-grid.png` });

  const lastFaked = (re) => [...guard.log].reverse().find((e) => re.test(e.url));
  const waitFaked = async (re, before) => {
    for (let i = 0; i < 50; i++) {
      if (guard.log.length > before && guard.log.slice(before).some((e) => re.test(e.url))) return lastFaked(re);
      await page.waitForTimeout(100);
    }
    return null;
  };

  // 1. Mouse drag: third photo onto the first.
  let n = guard.log.length;
  const h3 = await tiles.nth(2).locator(".album-photos__handle").boundingBox();
  const t1 = await tiles.nth(0).boundingBox();
  await page.mouse.move(h3.x + h3.width / 2, h3.y + h3.height / 2);
  await page.mouse.down();
  await page.mouse.move(h3.x + 20, h3.y + 10, { steps: 5 });
  await page.mouse.move(t1.x + t1.width / 2, t1.y + t1.height / 2, { steps: 15 });
  await page.waitForTimeout(300);
  await page.mouse.up();
  let hit = await waitFaked(/\/api\/photos\/reorder-photos/, n);
  let body = hit && JSON.parse(hit.body);
  const want1 = [expected[2], expected[0], expected[1], ...expected.slice(3)];
  check("mouse drag saves the new order", body && body.album === ALBUM && body.moved === expected[2] && JSON.stringify(body.order) === JSON.stringify(want1), hit?.body);
  await page.waitForTimeout(1500);

  // 2. Keyboard: focus the first handle, Space, Right, Space.
  n = guard.log.length;
  await tiles.nth(0).locator(".album-photos__handle").focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");
  hit = await waitFaked(/\/api\/photos\/reorder-photos/, n);
  body = hit && JSON.parse(hit.body);
  check("keyboard drag saves", body && body.moved === expected[0] && body.order[1] === expected[0], hit?.body);
  await page.waitForTimeout(1500);

  const openMenu = async (i) => {
    await tiles.nth(i).locator(".album-photos__menu-button").click();
    await page.waitForTimeout(250);
  };

  // 3. Cover menu: first photo has no "Set as album cover".
  await openMenu(0);
  check("cover's menu has no 'Set as album cover'", (await page.getByRole("button", { name: "Set as album cover" }).count()) === 0);
  await page.screenshot({ path: `${shots}/5-menu-cover.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  // 4. Set as album cover on the fourth photo.
  n = guard.log.length;
  await openMenu(3);
  await page.screenshot({ path: `${shots}/5-menu.png` });
  await page.getByRole("button", { name: "Set as album cover" }).click();
  hit = await waitFaked(/\/api\/photos\/reorder-photos/, n);
  body = hit && JSON.parse(hit.body);
  const want4 = [expected[3], ...expected.filter((id) => id !== expected[3])];
  check("Set as album cover moves it first", body && body.moved === expected[3] && JSON.stringify(body.order) === JSON.stringify(want4), hit?.body);
  await page.waitForTimeout(1500);

  // 5. Remove from album.
  n = guard.log.length;
  await openMenu(1);
  await page.getByRole("button", { name: "Remove from album" }).click();
  hit = await waitFaked(new RegExp(`/api/photos/${expected[1]}(\\?|$)`), n);
  check("Remove from album sends event: null", hit && hit.method === "PATCH" && JSON.parse(hit.body).event === null, hit && `${hit.method} ${hit.body}`);
  // The message waits for the usage check (where the photo went), so wait for it.
  const removedToast = page.locator("[data-sonner-toast]").filter({ hasText: `Removed "${altById.get(expected[1])}"` }).first();
  const toastShown = await removedToast.waitFor({ timeout: 10000 }).then(() => true, () => false);
  check("toast after remove says where the photo went", toastShown && /still used as|now under Unused photos/.test(await removedToast.innerText()), toastShown ? await removedToast.innerText() : "no toast within 10s");
  await page.waitForTimeout(1500);

  // 6. Delete photo…: usage check (real read), dialog, confirm.
  n = guard.log.length;
  await openMenu(2);
  await page.getByRole("button", { name: "Delete photo…" }).click();
  const modal = page.locator(".confirmation-modal, [class*='confirmation-modal']").first();
  await modal.waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${shots}/5-delete-dialog.png` });
  check("delete dialog heading names the photo", (await modal.innerText()).includes(`Delete "${altById.get(expected[2])}"?`), (await modal.innerText()).slice(0, 200));
  await page.getByRole("button", { name: "Delete photo" }).last().click();
  hit = await waitFaked(new RegExp(`/api/photos/${expected[2]}(\\?|$)`), n);
  check("Delete sends deletedAt (to Trash, not a permanent delete)", hit && hit.method === "PATCH" && Boolean(JSON.parse(hit.body).deletedAt), hit && `${hit.method} ${hit.body}`);
  await page.waitForTimeout(1500);

  // 7. Edit photo details: the photo's form in a drawer; close without saving.
  await openMenu(0);
  await page.getByRole("button", { name: "Edit photo details" }).click();
  const drawer = page.locator(".drawer__content").last();
  await drawer.waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${shots}/5-edit-drawer.png` });
  check("edit drawer shows the photo's alt text field", (await drawer.locator("input[name='alt'], #field-alt").count()) > 0);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);
  check("drawer closes", (await page.locator(".drawer__content").count()) === 0 || !(await page.locator(".drawer__content").last().isVisible()));
  // Can reopen (the grid unmounts it on close).
  await openMenu(1);
  await page.getByRole("button", { name: "Edit photo details" }).click();
  await page.locator(".drawer__content").last().waitFor({ timeout: 30000 });
  check("drawer reopens for another photo", true);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);

  // 8. A failed save shows why and the grid goes back to what's saved.
  await page.route("**/api/photos/reorder-photos", (route) =>
    route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "This list changed somewhere else. Reload the page and try again." }) }),
  );
  await openMenu(4);
  await page.getByRole("button", { name: "Set as album cover" }).click();
  await page.locator(".album-photos__error").waitFor({ timeout: 10000 });
  check("failed save shows the reason", (await page.locator(".album-photos__error").innerText()).includes("changed somewhere else"));
  asExpected("the forced 409 reached the browser (logged as a console error)", errors.some((e) => FORCED_409.test(e)));
  await page.waitForTimeout(1000);
  const after = await shownIds();
  check("grid back to the saved order after a failure", after.every((l, i) => l === `Drag to reorder ${altById.get(expected[i])}`));
  await page.unroute("**/api/photos/reorder-photos");

  // 9. The album form wasn't marked changed by any of this.
  const saveBtn = page.locator("#action-save");
  check("album's Save still disabled (form untouched)", await saveBtn.isDisabled().catch(() => "n/a"));

  // 10. Phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.locator(".album-photos").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/5-phone.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow <= 0) check("no horizontal scroll at 390px", true);
  else {
    // Payload's own side menu header is a few pixels wider than a phone
    // screen on every studio page (docs/build-2-plan.md, Mobile follow-ups).
    const culprits = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      return [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > vw + 1).map((el) => String(el.className).split(" ")[0]);
    });
    const onlyPayloadNav = culprits.length > 0 && culprits.every((c) => c.startsWith("nav"));
    if (onlyPayloadNav && overflow <= 20) known("Payload's side menu scrolls sideways on phones", `overflow ${overflow}px, from ${[...new Set(culprits)].join(", ")}`);
    else check("no horizontal scroll at 390px", false, `overflow ${overflow}, from ${[...new Set(culprits)].join(", ")}`);
  }
  await page.setViewportSize({ width: 1400, height: 950 });

  // 11. New album: nothing to show until saved.
  await page.goto(`${ADMIN}/collections/events/create`, { timeout: 120000 });
  await page.locator(".album-photos").waitFor({ timeout: 60000 });
  // Changed on purpose (uploads): a new album offers "Save & upload photos"
  // instead of saying "Save the album first".
  asExpected(
    "new album offers Save & upload photos (was: 'Save the album first')",
    (await page.getByRole("button", { name: "Save & upload photos" }).count()) === 1 && !(await page.locator(".album-photos").innerText()).includes("Save the album first"),
  );

  // 12. The usage endpoint (a read): a category cover photo.
  const cats = await (await page.request.get(`${API}/categories?depth=0&pagination=false`)).json();
  const withCover = cats.docs.find((c) => c.coverPhoto);
  if (withCover) {
    const usage = await (await page.request.get(`${API}/photos/${withCover.coverPhoto}/usage`)).json();
    check("usage lists a category cover", usage.uses?.some((u) => u.includes(`cover of the "${withCover.name}"`)), JSON.stringify(usage));
  }
  const unauth = await browser.newContext().then((c) => c.request.get(`${API}/photos/${expected[0]}/usage`));
  check("usage endpoint refuses signed-out requests", unauth.status() === 401, String(unauth.status()));

  const unexpectedErrors = errors.filter((e) => !/Download the React DevTools|favicon/.test(e) && !FORCED_409.test(e));
  check("no page errors (besides the forced 409)", unexpectedErrors.length === 0, unexpectedErrors.slice(0, 5).join(" || "));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
