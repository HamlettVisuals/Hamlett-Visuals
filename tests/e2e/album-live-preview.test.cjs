// Live Preview follows photo changes: the preview frame gets one "payload-document-event" per change (one for a batch of uploads) and re-renders.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e album-live-preview` (see README.md).
const { launchBrowser, newContext, report, outDir, fixtures, ADMIN, BASE } = require("./lib/harness.cjs");

const r = report("album-live-preview");
const { check } = r;
const shots = outDir("album-live-preview");
const ALBUM = 16;

(async () => {
  const browser = await launchBrowser();
  const fx = await fixtures();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1600, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Re-renders of the preview page: RSC requests from the preview frame.
  const rsc = [];
  page.on("request", (req) => {
    const frame = req.frame();
    if (frame && frame !== page.mainFrame() && (req.headers()["rsc"] === "1" || req.url().includes("_rsc="))) rsc.push(req.url());
  });

  await page.route("**/hv-studio/api/photos/reorder-photos", (route) => route.fulfill({ json: { updated: 1 } }));
  await page.route("**/storage-s3-generate-signed-url", (route) => route.fulfill({ json: { url: "https://fake-r2.invalid/p/x.jpg", filename: "x.jpg", docPrefix: "photos" } }));
  await page.route("https://fake-r2.invalid/**", (route) =>
    route.request().method() === "OPTIONS"
      ? route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT", "access-control-allow-headers": "*" } })
      : route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, body: "" }),
  );
  let created = 0;
  await page.route(/\/hv-studio\/api\/photos\?depth=0$/, (route) =>
    route.request().method() === "POST" ? route.fulfill({ status: 201, json: { doc: { id: 91000 + ++created } } }) : route.fallback(),
  );

  await page.goto(`${ADMIN}/collections/events/${ALBUM}`, { timeout: 120000 });
  await page.locator(".album-photos__tile").first().waitFor({ timeout: 60000 });
  // Open Live Preview (the eye button in the document controls).
  await page.locator(".live-preview-toggler, button[aria-label*='Live Preview' i], button[title*='Live Preview' i]").first().click();
  const iframe = page.locator("iframe.live-preview-iframe, .live-preview-window iframe").first();
  await iframe.waitFor({ timeout: 60000 });
  // The preview page can take a while the first time (the dev server
  // compiles it), so wait for its frame rather than a fixed time.
  let frame;
  for (let i = 0; i < 120 && !frame; i++) {
    frame = page.frames().find((f) => f !== page.mainFrame() && f.url().startsWith(`${BASE}/portfolio/`));
    if (!frame) await page.waitForTimeout(500);
  }
  if (frame) await frame.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(3000);
  check("preview frame loaded", Boolean(frame), frame?.url());
  if (!frame) throw new Error("the Live Preview frame never loaded");
  await page.screenshot({ path: `${shots}/8-preview.png` });

  // One listener; each step just clears the list.
  const listen = () =>
    frame.evaluate(() => {
      window.__docEvents = [];
      if (window.__listening) return;
      window.__listening = true;
      window.addEventListener("message", (e) => {
        if (e.data?.type === "payload-document-event") window.__docEvents.push(Date.now());
      });
    });
  const docEvents = () => frame.evaluate(() => window.__docEvents.length);
  await listen();

  // 1. Set as album cover (a reorder).
  rsc.length = 0;
  await page.locator(".album-photos__tile").nth(2).locator(".album-photos__menu-button").click();
  await page.getByRole("button", { name: "Set as album cover" }).click();
  await page.waitForTimeout(3000);
  check("reorder → preview told once", (await docEvents()) === 1, String(await docEvents()));
  check("…and it re-renders (router.refresh)", rsc.length > 0, `${rsc.length} RSC requests`);

  // 2. Remove from album.
  await listen();
  rsc.length = 0;
  await page.locator(".album-photos__tile").nth(1).locator(".album-photos__menu-button").click();
  await page.getByRole("button", { name: "Remove from album" }).click();
  await page.waitForTimeout(3000);
  check("remove → preview told", (await docEvents()) === 1 && rsc.length > 0, `${await docEvents()} events, ${rsc.length} RSC`);

  // 3. Three uploads in a row: told once when they're done (or close to it).
  await listen();
  await page.locator(".album-photos__file-input").setInputFiles([fx.testA, fx.testB, fx.testA]);
  for (let i = 0; i < 60 && created < 3; i++) await page.waitForTimeout(200);
  await page.waitForTimeout(2500);
  const n = await docEvents();
  check("3 quick uploads → preview told once, not 3 times", created === 3 && n === 1, `${created} created, ${n} events`);

  // 4. Nothing happening → no refreshes.
  await listen();
  await page.waitForTimeout(3000);
  check("no refreshes without changes", (await docEvents()) === 0);

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/fake-r2|storage-s3|photos\?depth|reorder-photos|api\/photos\/\d+$|payload-preferences/.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
