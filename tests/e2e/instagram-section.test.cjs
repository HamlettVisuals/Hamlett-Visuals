// The Instagram Section editor (globals/InstagramSection.ts,
// components/admin/Instagram/*): two fixed account cards (no add, remove or
// reorder), each with its status, Sync now / Connect, the Visible switch
// (locked until connected) and the featured-posts picker: adding by tapping
// thumbnails, the 9 limit, removing, reordering by the drag handle (mouse at
// 1440, press-and-hold touch on a phone), the "Showing 6 of N" note while
// both accounts are visible, and the order a save sends.
//
// The account statuses (/api/instagram/status) and each account's synced
// posts are made up here (posts 9101-9112), so the test doesn't depend on
// what's synced. Every write is faked: the shared guard (lib/guard.cjs), and
// this file's own answers for Sync now, Connect and the save. Nothing is
// saved or synced.
// Run with `npm run test:e2e instagram-section` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN } = require("./lib/harness.cjs");

const r = report("instagram-section");
const { check, section } = r;
const shots = outDir("instagram-section");
const URL_ = `${ADMIN}/globals/instagram-section`;

const TYPES = ["image", "video", "carousel", "image"];
const thumb = (n) =>
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400"><rect width="320" height="400" fill="hsl(${n * 29},40%,55%)"/><text x="160" y="210" font-size="80" text-anchor="middle" fill="#fff">${n}</text></svg>`);
const POSTS = Array.from({ length: 12 }, (_, i) => ({
  id: 9101 + i,
  caption: `Test post ${i + 1}`,
  mediaType: TYPES[i % TYPES.length],
  isMock: true,
  postedAt: new Date(Date.UTC(2026, 9, 20 - i)).toISOString(),
  url: thumb(i + 1),
  sizes: { thumbnail: { url: thumb(i + 1) } },
}));
const caption = (id) => POSTS.find((p) => p.id === id).caption;

// slot2: false (not connected), true (connected), or "failed" (connected,
// its first sync failed, as after a real connect missing a permission).
const status = (slot2) => ({
  mockAllowed: true,
  accounts: [
    { slot: 1, status: "connected", username: "hamlettvisuals", lastSyncedAt: new Date(Date.now() - 2 * 3600e3).toISOString(), lastError: null, isMock: false, syncState: "ok" },
    slot2 === "failed"
      ? { slot: 2, status: "connected", username: "second", lastSyncedAt: null, lastError: "(#10) Application does not have permission for this action", isMock: false, syncState: "failed" }
      : slot2
        ? { slot: 2, status: "connected", username: "second", lastSyncedAt: new Date().toISOString(), lastError: null, isMock: false, syncState: "ok" }
        : { slot: 2, status: "not_connected", username: null, lastSyncedAt: null, lastError: null, isMock: false, syncState: "never" },
  ],
});

// Statuses, both accounts' posts (slot 1's from POSTS, slot 2's none), Sync
// now and Connect. Returns counters for what was asked.
async function fakeInstagram(page, { slot2Connected }) {
  const seen = { postFetches: 0, sync: [], connect: [] };
  await page.route("**/api/instagram/status", (route) => route.fulfill({ json: status(slot2Connected) }));
  await page.route(/\/hv-studio\/api\/instagram-posts\?/, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const slot = new URL(route.request().url()).searchParams.get("where[connection.slot][equals]");
    seen.postFetches++;
    route.fulfill({ json: { docs: slot === "1" ? POSTS : [], totalDocs: slot === "1" ? POSTS.length : 0 } });
  });
  await page.route("**/api/instagram/sync", (route) => {
    seen.sync.push(route.request().postData());
    route.fulfill({ json: { result: { slot: 1, outcome: "synced", created: 2, updated: 1, pruned: 0, failedPosts: 0 }, status: status(slot2Connected) } });
  });
  await page.route("**/api/instagram/connect", (route) => {
    seen.connect.push(route.request().postData());
    route.fulfill({ status: 501, json: { error: "Connecting another Instagram account isn't available yet. It's coming once Instagram is set up." } });
  });
  return seen;
}

async function open(page, { closePreview = false } = {}) {
  await page.goto(URL_, { timeout: 120000 });
  await page.locator(".ig-account__header").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  if (closePreview && (await page.locator(".live-preview-window--is-live-previewing").count())) {
    await page.locator(".live-preview-toggler").first().click();
    await page.waitForTimeout(800);
  }
}

const card = (page, i) => page.locator(".ig-accounts .array-field__row").nth(i);
const picks = (page) => card(page, 0).locator(".ig-featured__tile").evaluateAll((els) => els.map((e) => Number(e.dataset.id)));

async function clearPicks(page) {
  while (await card(page, 0).locator(".ig-featured__remove").count()) {
    await card(page, 0).locator(".ig-featured__remove").first().click();
    await page.waitForTimeout(100);
  }
}

async function addPosts(page, ids) {
  const toggle = card(page, 0).getByRole("button", { name: /^Add (more )?posts$/ });
  if (await toggle.count()) await toggle.click();
  for (const id of ids) {
    await card(page, 0).getByRole("button", { name: `Add ${caption(id)}`, exact: true }).click();
    await page.waitForTimeout(100);
  }
  const done = card(page, 0).getByRole("button", { name: "Done adding" });
  if (await done.count()) await done.click();
}

// Drags one tile's handle onto another tile (mouse, or CDP touch with a
// press-and-hold first).
async function dragTile(page, from, to, cdp) {
  const tiles = card(page, 0).locator(".ig-featured__tile");
  await tiles.nth(from).scrollIntoViewIfNeeded();
  const a = await tiles.nth(from).locator(".ig-featured__handle").boundingBox();
  const b = await tiles.nth(to).boundingBox();
  const x0 = a.x + a.width / 2, y0 = a.y + a.height / 2;
  const x1 = b.x + b.width / 2, y1 = b.y + b.height / 2;
  const tp = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
  if (cdp) { await tp("touchStart", [{ x: x0, y: y0 }]); await page.waitForTimeout(400); await tp("touchMove", [{ x: x0 + 6, y: y0 }]); }
  else { await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(x0 + 8, y0, { steps: 3 }); }
  for (let i = 1; i <= 15; i++) {
    const x = x0 + ((x1 - x0) * i) / 15, y = y0 + ((y1 - y0) * i) / 15;
    cdp ? await tp("touchMove", [{ x, y }]) : await page.mouse.move(x, y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(150);
  cdp ? await tp("touchEnd", []) : await page.mouse.up();
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await launchBrowser();
  const errors = [];

  // ---- 1440, second account not connected
  let { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  let seen = await fakeInstagram(page, { slot2Connected: false });
  await open(page);

  section("two fixed account cards");
  check("two cards", (await page.locator(".ig-accounts .array-field__row").count()) === 2);
  check("headed Main account and Second account", JSON.stringify(await page.locator(".ig-account__label").evaluateAll((els) => els.map((e) => e.firstChild.textContent))) === '["Main account","Second account"]');
  check("no add-row button", !(await page.locator(".ig-accounts .array-field__add-row").isVisible().catch(() => false)));
  check("no row actions (remove / duplicate / move)", (await page.locator(".ig-accounts .array-actions").evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length)) === 0);
  check("no copy / paste / collapse-all controls", (await page.locator(".ig-accounts .array-field__header-actions").evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length)) === 0);

  section("status lines and buttons");
  const status1 = await card(page, 0).locator(".ig-account__status").innerText();
  check("main account: connected, last synced 2 hours ago", /^Connected · last synced 2 hours ago$/.test(status1), status1);
  check("main account: Sync now", await card(page, 0).getByRole("button", { name: "Sync now" }).isVisible());
  check("second account: Not connected", (await card(page, 1).locator(".ig-account__status").innerText()) === "Not connected");
  check("second account: Connect second account", await card(page, 1).getByRole("button", { name: "Connect second account" }).isVisible());
  check("second account: Visible switch locked", await card(page, 1).locator(".ig-visible button[role=switch]").isDisabled());
  check("second account: says Not connected", /Not connected/.test(await card(page, 1).locator(".ig-visible").innerText()));
  check("second account: no picker, a hint instead", /Connect this account to pick its posts/.test(await card(page, 1).locator(".ig-featured").innerText()));
  check("main account: Visible switch usable", !(await card(page, 0).locator(".ig-visible button[role=switch]").isDisabled()));

  await card(page, 1).getByRole("button", { name: "Connect second account" }).click();
  await page.waitForTimeout(800);
  check("Connect (stubbed) asks for slot 2", seen.connect.length === 1 && JSON.parse(seen.connect[0]).slot === 2, seen.connect);
  check("and says it isn't available yet", /isn't available yet/.test(await card(page, 1).locator(".ig-account__message").innerText()));

  const fetchesBefore = seen.postFetches;
  await card(page, 0).getByRole("button", { name: "Sync now" }).click();
  await page.waitForTimeout(1200);
  check("Sync now asks for slot 1", seen.sync.length === 1 && JSON.parse(seen.sync[0]).slot === 1, seen.sync);
  check("and reports what changed", (await card(page, 0).locator(".ig-account__message").innerText()) === "Synced: 2 new, 1 updated.");
  check("and reloads the posts to pick from", seen.postFetches > fetchesBefore, `${fetchesBefore} -> ${seen.postFetches}`);
  await page.screenshot({ path: `${shots}/1-cards.png`, fullPage: true });
  await ctx.close();

  // ---- 1440, second account connected but its first sync failed
  ({ ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } }));
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await fakeInstagram(page, { slot2Connected: "failed" });
  await open(page);

  section("a failed sync shows as an error, not a success time");
  const failedStatus = card(page, 1).locator(".ig-account__status");
  check("second account: Connected · last sync failed", (await failedStatus.innerText()) === "Connected · last sync failed", await failedStatus.innerText());
  check("in the error style", /ig-account__status--sync_failed/.test(await failedStatus.getAttribute("class")));
  const failedError = await card(page, 1).locator(".ig-account__error").innerText();
  check("with the reason and no successful sync yet", /does not have permission/.test(failedError) && /No successful sync yet\./.test(failedError), failedError);
  check("no 'last synced' time anywhere on the card", !/last synced/.test(await card(page, 1).locator(".ig-account__header").innerText()));
  check("main account unaffected", (await card(page, 0).locator(".ig-account__status").innerText()) === "Connected · last synced 2 hours ago");
  await page.screenshot({ path: `${shots}/1b-sync-failed.png`, fullPage: true });
  await ctx.close();

  // ---- 1440, both connected: picker, note, drag, save
  ({ ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } }));
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await fakeInstagram(page, { slot2Connected: true });
  await open(page);
  await clearPicks(page);

  section("adding by tapping thumbnails");
  await card(page, 0).getByRole("button", { name: "Add posts" }).click();
  check("all 12 synced posts offered", (await card(page, 0).locator(".ig-featured__choice").count()) === 12);
  check("videos and carousels tagged", (await card(page, 0).locator(".ig-featured__choices .ig-featured__type").allInnerTexts()).join(",") === "Video,Carousel,Video,Carousel,Video,Carousel");
  await addPosts(page, [9105, 9102, 9110]);
  check("picks in the order tapped", JSON.stringify(await picks(page)) === "[9105,9102,9110]", await picks(page));
  check("positions numbered 1-3", JSON.stringify(await card(page, 0).locator(".ig-featured__position").allInnerTexts()) === '["1","2","3"]');
  await card(page, 0).getByRole("button", { name: "Add more posts" }).click();
  check("picked posts aren't offered again", (await card(page, 0).locator(".ig-featured__choice").count()) === 9);
  await card(page, 0).getByRole("button", { name: "Done adding" }).click();

  section("the 9 limit");
  await addPosts(page, [9101, 9103, 9104, 9106, 9107, 9108]);
  check("9 picked", (await picks(page)).length === 9);
  check("no Add button at 9", (await card(page, 0).getByRole("button", { name: /^Add (more )?posts$/ }).count()) === 0);
  check("says 9 of 9", /9 of 9 picked\. Remove one to add another\./.test(await card(page, 0).locator(".ig-featured").innerText()));

  section("remove");
  await card(page, 0).getByRole("button", { name: `Remove ${caption(9108)}`, exact: true }).click();
  check("8 left, 9108 gone", JSON.stringify(await picks(page)) === "[9105,9102,9110,9101,9103,9104,9106,9107]", await picks(page));

  section("Showing 6 of N while both accounts are visible");
  check("no note while the second account is off", (await card(page, 0).locator(".ig-featured__note").count()) === 0);
  await card(page, 1).locator(".ig-visible button[role=switch]").click();
  await page.waitForTimeout(300);
  check("note with both visible", (await card(page, 0).locator(".ig-featured__note").innerText().catch(() => "")) === "Showing 6 of 8 while both accounts are visible.");
  check("picks 7 and 8 dimmed", (await card(page, 0).locator(".ig-featured__tile--muted").count()) === 2);
  await card(page, 1).locator(".ig-visible button[role=switch]").click();
  await page.waitForTimeout(300);
  check("note gone again", (await card(page, 0).locator(".ig-featured__note").count()) === 0);

  section("drag with the mouse");
  await dragTile(page, 2, 0, null);
  check("3rd dragged to the front", JSON.stringify((await picks(page)).slice(0, 3)) === "[9110,9105,9102]", await picks(page));
  await dragTile(page, 0, 4, null);
  check("then to 5th", JSON.stringify((await picks(page)).slice(0, 5)) === "[9105,9102,9101,9103,9110]", await picks(page));
  await page.screenshot({ path: `${shots}/2-picked.png`, fullPage: true });

  section("publish sends the picks in order (faked)");
  let body = "";
  await page.route(/\/hv-studio\/api\/globals\/instagram-section(\?|$)/, async (route) => {
    if (route.request().method() !== "POST" || (await route.request().headerValue("x-payload-http-method-override")) === "GET") return route.fallback();
    body = route.request().postData() || "";
    return route.fallback(); // the guard fakes it
  });
  await page.locator("#action-save, button:has-text('Publish')").first().click();
  await page.waitForTimeout(2500);
  check("a save was sent and faked", body.length > 0 && guard.lines().some((l) => /FAKED POST .*globals\/instagram-section/.test(l)), guard.lines().slice(-5));
  const sentPicks = body.match(/"featured":\[([\d,]*)\]/)?.[1];
  check("it carries the main account's picks in the new order", sentPicks === "9105,9102,9101,9103,9110,9104,9106,9107", sentPicks);
  check("and both slots, in order", /"slot":1[\s\S]*"slot":2/.test(body));
  await ctx.close();

  // ---- 390x844 phone, touch
  section("phone, press-and-hold");
  const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page = await phone.ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await fakeInstagram(page, { slot2Connected: true });
  await open(page, { closePreview: true });
  await clearPicks(page);
  await addPosts(page, [9101, 9102, 9103, 9104]);
  check("4 picks on the phone", JSON.stringify(await picks(page)) === "[9101,9102,9103,9104]", await picks(page));
  check("3 tiles to a row", await card(page, 0).locator(".ig-featured__tile").evaluateAll((els) => els[0].getBoundingClientRect().top === els[2].getBoundingClientRect().top && els[3].getBoundingClientRect().top > els[0].getBoundingClientRect().top));
  const cdp = await phone.ctx.newCDPSession(page);
  await dragTile(page, 3, 0, cdp);
  check("press-and-hold drag: 4th to the front", JSON.stringify(await picks(page)) === "[9104,9101,9102,9103]", await picks(page));
  const buttonWidth = await card(page, 0).getByRole("button", { name: "Sync now" }).evaluate((b) => b.getBoundingClientRect().width);
  check("Sync now full width on the phone", buttonWidth > 300, buttonWidth);
  await checkNoSidewaysScroll(page, r, "no sideways scroll at 390");
  check("nothing was saved on the phone", phone.guard.writes().length === 0, phone.guard.lines());
  await page.screenshot({ path: `${shots}/3-phone.png`, fullPage: true });
  await phone.ctx.close();

  section("page");
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
