// The Testimonials Section editor (globals/TestimonialsTeaser.ts): its name in
// the page title, breadcrumb, sidebar and Editor overview, and the picks as
// rows (TestimonialPicksField.tsx): added with Payload's picker, which leaves
// out what's picked, reordered by the drag handle (mouse at 1440, press-and-
// hold touch on a phone), removed per row, and no picker once 4 are picked.
// There are no real testimonials yet, so every testimonials lookup is
// answered with made-up ones (ids 9001-9006).
//
// Every write is faked by the shared guard (lib/guard.cjs); nothing is saved.
// Run with `npm run test:e2e testimonials-section` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN, API } = require("./lib/harness.cjs");

const r = report("testimonials-section");
const { check, section } = r;
const shots = outDir("testimonials-section");
const URL_ = `${ADMIN}/globals/testimonials-teaser`;

const FIXTURES = [
  [9001, "Priya & Daniel", "She made the whole day feel easy, and the photos are unreal."],
  [9002, "Marcus", "Fast, friendly and the shots from the track were exactly what we wanted."],
  [9003, "The Okafor family", "Our listing photos sold the house in a week."],
  [9004, "Lena", "Calm, kind and so good with the kids."],
  [9005, "Tom & Ash", "Every moment we'd have missed, she caught."],
  [9006, "Ridgeway Motors", "Clean, sharp car photos, delivered the next day."],
].map(([id, clientName, quote]) => ({ id, clientName, quote, published: true, deletedAt: null, category: 1 }));
const nameOf = (id) => FIXTURES.find((f) => f.id === id).clientName;

// Answers every testimonials lookup (Payload's picker, the rows' names, the
// unavailable-picks note) from FIXTURES, honouring id in/not_in and a search.
async function mockTestimonials(page) {
  // Payload's picker asks with a POST marked as a GET (query in the body).
  await page.route(/\/hv-studio\/api\/testimonials(\?|$)/, async (route) => {
    const req = route.request();
    const asGet = req.method() === "POST" && (await req.headerValue("x-payload-http-method-override")) === "GET";
    if (req.method() !== "GET" && !asGet) return route.fallback();
    const params = [...new URL(req.url()).searchParams, ...(asGet ? new URLSearchParams(req.postData() || "") : [])];
    const inIds = params.filter(([k]) => /\[id\]\[in\]/.test(k)).flatMap(([, v]) => v.split(",")).map(Number);
    const notIn = params.filter(([k]) => /\[id\]\[not_in\]/.test(k)).flatMap(([, v]) => v.split(",")).map(Number);
    const search = params.find(([k]) => /\[clientName\]\[(like|contains)\]/.test(k))?.[1]?.toLowerCase();
    const docs = FIXTURES.filter((f) => (!inIds.length || inIds.includes(f.id)) && !notIn.includes(f.id) && (!search || f.clientName.toLowerCase().includes(search)));
    route.fulfill({ json: { docs, totalDocs: docs.length, hasNextPage: false, page: 1, totalPages: 1, limit: 10 } });
  });
}

const rows = (page) => page.locator(".testimonial-picks__row .testimonial-picks__name").allInnerTexts();
const picker = (page) => page.locator(".testimonial-picks__add .react-select");

async function pickerOptions(page) {
  await picker(page).click();
  await page.locator("[id*='-option-']").first().waitFor({ timeout: 15000 }).catch(() => {});
  const opts = await page.locator("[id*='-option-']").allInnerTexts();
  await page.keyboard.press("Escape");
  return opts.map((o) => o.trim());
}

async function pick(page, name) {
  await picker(page).click();
  await page.locator("[id*='-option-']", { hasText: name }).first().click({ timeout: 15000 });
  await page.waitForTimeout(400);
}

async function open(page) {
  await page.goto(URL_, { timeout: 120000 });
  await page.locator(".testimonial-picks").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
}

// Drags a row's handle onto another row's position (mouse, or CDP touch
// with a press-and-hold first, as in portfolio-reorder).
async function dragRow(page, from, to, cdp) {
  const handles = page.locator(".testimonial-picks__row .portfolio__handle");
  const a = await handles.nth(from).boundingBox();
  const b = await handles.nth(to).boundingBox();
  const x = a.x + a.width / 2, y0 = a.y + a.height / 2;
  const y1 = b.y + b.height / 2 + (to > from ? 8 : -8);
  const tp = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
  if (cdp) { await tp("touchStart", [{ x, y: y0 }]); await page.waitForTimeout(400); await tp("touchMove", [{ x, y: y0 + 6 }]); }
  else { await page.mouse.move(x, y0); await page.mouse.down(); await page.mouse.move(x, y0 + 8, { steps: 3 }); }
  for (let i = 1; i <= 12; i++) {
    const y = y0 + ((y1 - y0) * i) / 12;
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

  // ---- 1440, mouse
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const saved = await (await page.request.get(`${API}/globals/testimonials-teaser?depth=0`)).json();
  r.lines.push(`(saved picks: ${JSON.stringify(saved.testimonials ?? [])})`);
  await mockTestimonials(page);

  section("names");
  await open(page);
  const title = await page.title();
  check("page title says Testimonials Section", title.includes("Testimonials Section") && !title.includes("Teaser"), title);
  const heading = (await page.locator(".doc-header__title, h1").first().innerText()).trim();
  check("heading says Testimonials Section", heading === "Testimonials Section", heading);
  const crumbs = (await page.locator(".step-nav").innerText()).replace(/\s+/g, " ");
  check("breadcrumb says Testimonials Section", crumbs.includes("Testimonials Section") && !crumbs.includes("Teaser"), crumbs);
  const nav = await page.locator(".site-nav__label").allInnerTexts();
  check("sidebar says Testimonials Section", nav.includes("Testimonials Section") && !nav.some((l) => /Teaser|Testimonials Preview/.test(l)), nav);

  section("adding with the picker");
  // Start from no picks, whatever's saved.
  while (await page.locator(".testimonial-picks__remove").count()) await page.locator(".testimonial-picks__remove").first().click();
  check("no rows to start", (await rows(page)).length === 0);
  check("picker says Add a testimonial", (await picker(page).innerText()).includes("Add a testimonial"), await picker(page).innerText());
  let opts = await pickerOptions(page);
  check("picker offers all 6", FIXTURES.every((f) => opts.includes(f.clientName)), opts);
  await pick(page, "Marcus");
  await pick(page, "Lena");
  await pick(page, "Priya & Daniel");
  check("rows in the order picked", JSON.stringify(await rows(page)) === JSON.stringify(["Marcus", "Lena", "Priya & Daniel"]), await rows(page));
  check("rows show the quote", (await page.locator(".testimonial-picks__row .testimonial-picks__quote").first().innerText()).startsWith("Fast, friendly"));
  check("every row has a visible handle", await page.evaluate(() => [...document.querySelectorAll(".testimonial-picks__row")].every((row) => {
    const h = row.querySelector("button.portfolio__handle");
    const box = h?.getBoundingClientRect();
    return h && box.width >= 32 && box.height >= 44 && getComputedStyle(h).visibility === "visible" && getComputedStyle(h, "::before").content.includes("⋮");
  })));
  check("picker now says Add another testimonial", (await picker(page).innerText()).includes("Add another testimonial"));
  opts = await pickerOptions(page);
  check("picker leaves out what's picked", !opts.some((o) => ["Marcus", "Lena", "Priya & Daniel"].includes(o)) && opts.includes("Tom & Ash"), opts);

  section("the 4 limit");
  await pick(page, "Tom & Ash");
  check("4 rows", (await rows(page)).length === 4, await rows(page));
  check("no picker at 4", (await picker(page).count()) === 0);
  const full = await page.locator(".testimonial-picks__full").innerText().catch(() => "");
  check("note: 4 of 4 picked", full.trim() === "4 of 4 picked. Remove one to add another.", full);
  await page.screenshot({ path: `${shots}/1-four-picked.png`, fullPage: true });

  section("remove");
  await page.locator(".testimonial-picks__row", { hasText: "Lena" }).locator(".testimonial-picks__remove").click();
  await page.waitForTimeout(300);
  check("Lena removed, order kept", JSON.stringify(await rows(page)) === JSON.stringify(["Marcus", "Priya & Daniel", "Tom & Ash"]), await rows(page));
  check("picker back below 4", (await picker(page).count()) === 1);
  opts = await pickerOptions(page);
  check("Lena offered again", opts.includes("Lena"), opts);

  section("drag with the mouse");
  // A click on the handle alone doesn't move anything.
  await page.locator(".testimonial-picks__row .portfolio__handle").first().click();
  check("a click on the handle changes nothing", JSON.stringify(await rows(page)) === JSON.stringify(["Marcus", "Priya & Daniel", "Tom & Ash"]), await rows(page));
  await dragRow(page, 2, 0, null);
  check("Tom & Ash dragged to the top", JSON.stringify(await rows(page)) === JSON.stringify(["Tom & Ash", "Marcus", "Priya & Daniel"]), await rows(page));
  await dragRow(page, 0, 2, null);
  check("and back to the bottom", JSON.stringify(await rows(page)) === JSON.stringify(["Marcus", "Priya & Daniel", "Tom & Ash"]), await rows(page));
  await dragRow(page, 1, 0, null);
  check("Priya & Daniel dragged to the top", JSON.stringify(await rows(page)) === JSON.stringify(["Priya & Daniel", "Marcus", "Tom & Ash"]), await rows(page));
  check("positions numbered 1-3", JSON.stringify(await page.locator(".testimonial-picks__position").allInnerTexts()) === '["1","2","3"]');
  await page.screenshot({ path: `${shots}/2-reordered.png`, fullPage: true });

  section("publish sends the new order (faked)");
  const before = guard.writes().length;
  await page.locator("#action-save, button:has-text('Publish')").first().click();
  await page.waitForTimeout(2500);
  const sent = guard.writes().slice(before).filter((w) => /globals\/testimonials-teaser/.test(w.url));
  const body = sent.map((w) => w.body ?? "").join("\n");
  check("a save was sent and faked", sent.length >= 1, guard.lines().slice(-5));
  check("it carries the picks in the new order", /"testimonials":\[9001,9002,9005\]/.test(body), body.slice(0, 300));
  await page.close();
  await ctx.close();

  // ---- 390x844 phone, touch
  section("phone, press-and-hold");
  const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page = await phone.ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await mockTestimonials(page);
  await open(page);
  while (await page.locator(".testimonial-picks__remove").count()) await page.locator(".testimonial-picks__remove").first().click();
  for (const name of ["Marcus", "Lena", "Ridgeway Motors"]) await pick(page, name);
  check("3 rows on the phone", JSON.stringify(await rows(page)) === JSON.stringify(["Marcus", "Lena", "Ridgeway Motors"]), await rows(page));
  await page.locator(".testimonial-picks__list").scrollIntoViewIfNeeded();
  const cdp = await phone.ctx.newCDPSession(page);
  // A quick swipe on a handle (no hold) doesn't reorder.
  {
    const h = await page.locator(".testimonial-picks__row .portfolio__handle").nth(2).boundingBox();
    const tp = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
    await tp("touchStart", [{ x: h.x + 10, y: h.y + 10 }]);
    for (let i = 1; i <= 6; i++) { await tp("touchMove", [{ x: h.x + 10, y: h.y + 10 - i * 20 }]); await page.waitForTimeout(16); }
    await tp("touchEnd", []);
    await page.waitForTimeout(400);
  }
  check("a quick swipe doesn't reorder", JSON.stringify(await rows(page)) === JSON.stringify(["Marcus", "Lena", "Ridgeway Motors"]), await rows(page));
  await page.locator(".testimonial-picks__list").scrollIntoViewIfNeeded();
  await dragRow(page, 2, 0, cdp);
  check("press-and-hold drag: Ridgeway Motors to the top", JSON.stringify(await rows(page)) === JSON.stringify(["Ridgeway Motors", "Marcus", "Lena"]), await rows(page));
  check("rows fit the phone", await page.evaluate(() => [...document.querySelectorAll(".testimonial-picks__row")].every((row) => row.getBoundingClientRect().right <= document.documentElement.clientWidth)));
  await checkNoSidewaysScroll(page, r, "no sideways scroll at 390");
  await page.locator(".testimonial-picks").screenshot({ path: `${shots}/3-phone.png` });
  check("nothing was saved on the phone", phone.guard.writes().length === 0, phone.guard.lines());
  await page.close();

  section("Editor overview");
  page = await phone.ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`${ADMIN}/editor`, { timeout: 120000 });
  await page.locator(".editor-overview").first().waitFor({ timeout: 60000 });
  const tiles = (await page.locator(".editor-overview").innerText()).split("\n").map((t) => t.trim());
  check("overview says Testimonials Section", tiles.includes("Testimonials Section") && !tiles.some((t) => /Teaser|Testimonials Preview/.test(t)), tiles);

  check("no page errors", errors.length === 0, errors);
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
