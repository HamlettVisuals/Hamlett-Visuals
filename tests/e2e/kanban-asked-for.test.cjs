// The kanban's view of what a booking asked for (components/admin/
// KanbanBoard): a Planning card's date reads "Preferred Mar 20 ·
// Afternoon", and the card drawer's "What they asked for" shows the preferred
// date and time and the Instagram handle, linked to the profile. Desktop
// board and phone list.
//
// No booking has a time or handle saved yet, and this test writes nothing:
// it moves to the board from another studio page, so the board's data comes
// in its own request (?_rsc=), and fills in one live Planning card's time and
// handle in that response, in the browser only. Every write is faked by the
// guard (lib/guard.cjs). Run with `npm run test:e2e kanban-asked-for`.
const { launchBrowser, newContext, report, outDir, sleep, ADMIN, API } = require("./lib/harness.cjs");

const r = report("kanban-asked-for");
const { check, section } = r;
const shots = outDir("kanban-asked-for");
const HANDLE = "@e2e.client";

// A Planning booking with a preferred date (its card shows that date).
async function pickPlanning(page) {
  const { docs } = await (
    await page.request.get(`${API}/inquiries?where[inquiryType][equals]=booking&where[archived][not_equals]=true&where[stage][equals]=planning&depth=1&limit=100`)
  ).json();
  const d = docs.find((doc) => doc.preferredDate);
  return d && { id: d.id, name: (d.client && typeof d.client === "object" && d.client.name) || d.name, preferredDate: d.preferredDate };
}

// That card's time and handle, filled in on the board's data on its way in.
async function fillIn(page, id) {
  let rewritten = false;
  await page.route(/\/hv-studio\/kanban\?_rsc=/, async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    const at = body.indexOf(`{"id":${id},"type":"booking"`);
    if (at >= 0) {
      const head = body.slice(0, at);
      const tail = body
        .slice(at)
        .replace('"preferredTime":null', '"preferredTime":"afternoon"')
        .replace('"instagramHandle":null', `"instagramHandle":"${HANDLE}"`);
      rewritten = tail !== body.slice(at);
      body = head + tail;
    }
    await route.fulfill({ response: res, body });
  });
  return () => rewritten;
}

(async () => {
  const browser = await launchBrowser();
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    section(`${w}x${h}`);
    const { ctx, guard } = await newContext(browser, { viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const card = await pickPlanning(page);
    if (!card) {
      check("a live Planning booking with a preferred date to show", false);
      await ctx.close();
      continue;
    }
    const wasRewritten = await fillIn(page, card.id);
    await page.goto(`${ADMIN}/collections/inquiries`, { waitUntil: "networkidle", timeout: 120000 });
    await page.locator('a[href$="/kanban"]').first().evaluate((a) => a.click());
    await page.waitForURL(/\/kanban/, { timeout: 60000 });
    await page.locator("[class*='mobileGroupHeader'], [class*='columns'] [class*='card']").filter({ visible: true }).first().waitFor({ timeout: 60000 });
    await sleep(1000);
    check("the card's time and handle were filled in (browser only)", wasRewritten(), `inquiry ${card.id}`);

    const date = new Date(card.preferredDate).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric" });
    const label = `Preferred ${date} · Afternoon`;
    let row;
    if (touch) {
      const header = page.locator("[class*='mobileGroupHeader']", { hasText: "Planning" }).first();
      if ((await header.getAttribute("aria-expanded")) !== "true") await header.tap();
      row = page.locator("button[class*='mobileRow']", { hasText: card.name }).first();
    } else {
      const column = page.locator("h3[class*='columnTitle']", { hasText: /^Planning$/i }).locator("xpath=../..");
      row = column.locator("[class*='card']", { hasText: card.name }).first();
    }
    await row.scrollIntoViewIfNeeded();
    const text = (await row.innerText()).replace(/\s+/g, " ");
    check(`the ${touch ? "list row" : "card"} reads "${label}"`, text.includes(label), text);
    await row.screenshot({ path: `${shots}/${w}-card.png` });

    if (touch) await row.tap();
    else {
      const box = await row.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + 20);
    }
    await page.waitForSelector(".drawer--is-open .drawer__content-children", { timeout: 15000 });
    await sleep(700);
    const section_ = page.locator(".drawer--is-open section", { has: page.getByRole("heading", { name: "What they asked for" }) });
    check('the drawer has "What they asked for"', (await section_.count()) === 1);
    const asked = (await section_.innerText().catch(() => "")).replace(/\s+/g, " ");
    check("with the preferred date and time", asked.toLowerCase().includes(`preferred ${date} · afternoon`.toLowerCase()), asked);
    const link = section_.getByRole("link", { name: HANDLE });
    check("and the Instagram handle, linked to the profile", (await link.getAttribute("href").catch(() => null)) === "https://www.instagram.com/e2e.client/", await link.getAttribute("href").catch(() => null));
    const order = await page.evaluate(() => {
      const titles = [...document.querySelectorAll(".drawer--is-open h3")].map((h) => h.textContent.trim());
      return titles;
    });
    check("it sits before the client's message and Dates", order.indexOf("What they asked for") < order.indexOf("Dates"), order);
    await page.locator(".drawer--is-open .drawer__content-children").screenshot({ path: `${shots}/${w}-drawer.png` });
    check("nothing was written", guard.writes().length === 0, guard.writes().map((wr) => `${wr.method} ${wr.url}`));
    check("no page errors", errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
