// The Trash tab of Categories & Albums (/hv-studio/portfolio/trash), at
// desktop and phone: its three sections (empty in the shared database), the
// All / Trash tabs, the old Categories and Albums Trash URLs redirecting here,
// then sample deleted items: Restore and Delete permanently send Payload's
// own requests limited to that one trashed id (faked), Delete permanently
// asks first, Cancel sends nothing, and a refusal from the server is shown.
// Deleted photos have their own test (trash-photos.test.cjs).
//
// Nothing is in the Trash for real, so the sample items are swapped into the
// page's data (a read) as it's fetched on a client-side navigation to the tab.
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN } = require("./lib/harness.cjs");

const BASE = ADMIN;
const r = report("portfolio-trash");
const { check } = r;
const shots = outDir("portfolio-trash");

const SAMPLE = {
  categories: [{ id: 901, title: "Sample Deleted Category", deletedAt: "2026-09-29T15:00:00.000Z", thumbnail: null, note: null }],
  albums: [
    { id: 902, title: "Sample Deleted Album", deletedAt: "2026-09-29T15:00:00.000Z", thumbnail: null, note: "Test" },
    { id: 903, title: "Another Deleted Album", deletedAt: "2026-09-28T15:00:00.000Z", thumbnail: null, note: "Sample Deleted Category (also deleted)" },
  ],
};

(async () => {
  const browser = await launchBrowser();
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    r.section(`${w}x${h}`);
    const { ctx } = await newContext(browser, { viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 150)));
    const tap = (loc) => (touch ? loc.tap() : loc.click());
    const reqs = [];
    page.on("request", (req) => {
      if (["PATCH", "DELETE"].includes(req.method())) reqs.push({ method: req.method(), url: decodeURIComponent(req.url().replace(/.*\/api/, "/api")), body: req.postData() });
    });

    // The real Trash page (empty in the shared database) and the tabs.
    await page.goto(BASE + "/portfolio", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await tap(page.locator(".portfolio__tabs a", { hasText: "Trash" }));
    await page.waitForURL(/\/portfolio\/trash$/);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const real = await page.evaluate(() => ({
      sections: [...document.querySelectorAll(".portfolio-trash__section")].map(
        (s) => s.querySelector(".portfolio__name").innerText + ":" + (s.querySelector(".portfolio-trash__empty")?.innerText ?? s.querySelectorAll(".portfolio-trash__row").length),
      ),
      activeTab: document.querySelector('.portfolio__tabs [aria-current="page"]')?.innerText,
    }));
    check(
      "Trash tab: three sections, empty states, Trash tab active",
      JSON.stringify(real.sections) === '["Deleted categories:No deleted categories.","Deleted albums:No deleted albums.","Deleted photos:No deleted photos."]' && real.activeTab === "Trash",
      real,
    );
    for (const from of ["/collections/categories/trash", "/collections/events/trash", "/collections/photos/trash"]) {
      await page.goto(BASE + from, { waitUntil: "networkidle" });
      check(`${from} redirects to the combined Trash`, new URL(page.url()).pathname === "/hv-studio/portfolio/trash", page.url());
    }
    await tap(page.locator(".portfolio__tabs a", { hasText: "All" }));
    await page.waitForURL(/\/portfolio$/);
    check('"All" tab goes back', true);

    // Sample items: swapped into the tab's data on the next client-side visit.
    let swapped = false;
    await page.route("**/hv-studio/portfolio/trash**", async (route) => {
      if (route.request().headers()["rsc"] !== "1") return route.fallback();
      const res = await route.fetch();
      const body = await res.text();
      const next = body
        .replace('"categories":[]', `"categories":${JSON.stringify(SAMPLE.categories)}`)
        .replace('"albums":[]', `"albums":${JSON.stringify(SAMPLE.albums)}`);
      swapped = next !== body;
      await route.fulfill({ response: res, body: next });
    });
    await page.waitForTimeout(500);
    await tap(page.locator(".portfolio__tabs a", { hasText: "Trash" }));
    await page.getByText("Sample Deleted Album").waitFor({ timeout: 30000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    check("sample items reached the page", swapped);
    const rows = await page.evaluate(() => [...document.querySelectorAll(".portfolio-trash__row")].map((row) => row.innerText.replace(/\s+/g, " ")));
    check("rows show title, category and deletion date", rows.length === 3 && /Sample Deleted Album Test · Deleted 29 Sept 2026/.test(rows[1]) && /also deleted/.test(rows[2]), rows);
    await page.screenshot({ path: `${shots}/trash@${w}.png`, fullPage: true });

    const albumsRegion = page.getByRole("region", { name: "Deleted albums" });
    const categoriesRegion = page.getByRole("region", { name: "Deleted categories" });
    await tap(albumsRegion.locator(".portfolio-trash__row", { hasText: "Sample Deleted Album" }).getByRole("button", { name: "Restore" }));
    await page.waitForTimeout(800);
    const restoreReq = reqs.find((q) => q.method === "PATCH");
    check(
      "Restore: PATCH /api/events limited to that trashed id, deletedAt null (faked)",
      !!restoreReq &&
        restoreReq.url.startsWith("/api/events?") &&
        restoreReq.url.includes("trash=true") &&
        restoreReq.url.includes("where[and][0][id][equals]=902") &&
        restoreReq.url.includes("where[and][1][deletedAt][exists]=true") &&
        JSON.parse(restoreReq.body).deletedAt === null,
      restoreReq,
    );

    const visibleModalText = () =>
      page.evaluate(() => [...document.querySelectorAll('.confirmation-modal, [class*="confirmation-modal"]')].find((e) => e.checkVisibility())?.innerText.replace(/\s+/g, " ") ?? null);
    await tap(categoriesRegion.locator(".portfolio-trash__row").getByRole("button", { name: "Delete permanently" }));
    await page.waitForTimeout(500);
    const modal = await visibleModalText();
    check("Delete permanently asks first", !!modal && /Permanently delete "Sample Deleted Category"\?/.test(modal) && /can't be undone/.test(modal), modal);
    const deletesBefore = reqs.filter((q) => q.method === "DELETE").length;
    await tap(page.getByRole("button", { name: "Cancel" }));
    await page.waitForTimeout(400);
    check("Cancel sends nothing", reqs.filter((q) => q.method === "DELETE").length === deletesBefore);

    await tap(albumsRegion.locator(".portfolio-trash__row", { hasText: "Sample Deleted Album" }).getByRole("button", { name: "Delete permanently" }));
    await page.waitForTimeout(400);
    const albumModal = await visibleModalText();
    check("album confirmation says its photos stay (and where unused ones go)", /photos stay, no longer in any album/.test(albumModal || "") && /Unused photos/.test(albumModal || ""), albumModal);
    await tap(page.locator('.confirmation-modal, [class*="confirmation-modal"]').locator("visible=true").getByRole("button", { name: "Delete permanently" }));
    await page.waitForTimeout(800);
    const delReq = reqs.find((q) => q.method === "DELETE");
    check(
      "Confirm: DELETE /api/events limited to that trashed id (faked)",
      !!delReq && delReq.url.startsWith("/api/events?") && delReq.url.includes("where[and][0][id][equals]=902") && delReq.url.includes("[deletedAt][exists]=true"),
      delReq,
    );

    // A refusal from the server is shown (e.g. a category still used by albums).
    await page.route("**/api/categories?**", (route) =>
      route.request().method() === "DELETE"
        ? route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ docs: [], errors: [{ id: 901, message: "Can't permanently delete this category: 1 album uses it (including archived or trashed ones)." }] }),
          })
        : route.fallback(),
    );
    await tap(categoriesRegion.locator(".portfolio-trash__row").getByRole("button", { name: "Delete permanently" }));
    await page.waitForTimeout(400);
    await tap(page.locator('.confirmation-modal, [class*="confirmation-modal"]').locator("visible=true").getByRole("button", { name: "Delete permanently" }));
    await page.waitForTimeout(900);
    const toast = await page.evaluate(() => [...document.querySelectorAll("[data-sonner-toast], .toast")].map((t) => t.innerText.replace(/\s+/g, " ")).join(" | "));
    check("server refusal is shown as-is", /Can't permanently delete this category/.test(toast), toast);
    await checkNoSidewaysScroll(page, r, "no sideways scroll");
    check("no page errors", errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
