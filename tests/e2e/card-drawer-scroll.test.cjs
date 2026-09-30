// Kanban drawers scroll properly on every screen size, by real touch drags
// (trusted touch events through the browser's input pipeline) or the mouse
// wheel on desktop:
//   - the card drawer (the booking with the most content): scrolls to its
//     last item and back, its ✕ stays on screen, the page behind never
//     moves, and with a simulated on-screen keyboard (the view shrunk by
//     45% while typing in Notes) it still reaches its end with the field
//     focused; the ✕ closes it;
//   - Add Card, Questions and Templates on the smallest phones: each
//     reaches its end, ✕ on screen, page behind still, closes.
// Reads the live bookings; every write is faked.
const { launchBrowser, newContext, report, outDir, sleep, ADMIN } = require("./lib/harness.cjs");

const r = report("card-drawer-scroll");
const { check } = r;
const shots = outDir("card-drawer-scroll");
const STAGE_LABELS = { lead: "Lead", planning: "Planning", prep: "Prep", shoot: "Shoot Complete", post: "Post-Production", wrapup: "Wrap-Up" };

const CONFIGS = [
  { name: "375x667 phone", w: 375, h: 667, touch: true, platform: "iPhone", keyboard: false },
  { name: "390x844 phone", w: 390, h: 844, touch: true, platform: "iPhone", keyboard: true },
  { name: "390x844 Android phone", w: 390, h: 844, touch: true, platform: "Linux armv8l", keyboard: false },
  { name: "430x932 phone", w: 430, h: 932, touch: true, platform: "iPhone", keyboard: false },
  { name: "844x390 landscape phone", w: 844, h: 390, touch: true, platform: "iPhone", keyboard: true },
  { name: "820x1180 tablet", w: 820, h: 1180, touch: true, platform: "iPad", keyboard: false },
  { name: "1024x768 tablet", w: 1024, h: 768, touch: true, platform: "iPad", keyboard: false },
  { name: "1440x900 desktop", w: 1440, h: 900, touch: false, platform: null, keyboard: false },
];
const OTHER_DRAWERS = [
  { name: "Add Card", button: /^\+ Add Card$/ },
  { name: "Questions", button: /^Questions/ },
  { name: "Templates", button: /^Templates$/ },
];
const OTHER_CONFIGS = [
  { name: "375x667 iPhone", w: 375, h: 667, touch: true, platform: "iPhone" },
  { name: "844x390 landscape iPhone", w: 844, h: 390, touch: true, platform: "iPhone" },
  { name: "667x375 landscape iPhone SE", w: 667, h: 375, touch: true, platform: "iPhone" },
];

// E2E_ONLY=landscape runs only the sizes whose name contains that text.
const only = (list) => list.filter((cfg) => !process.env.E2E_ONLY || cfg.name.includes(process.env.E2E_ONLY));

// Chromium drops the click of a tap that comes too soon after a touch
// scroll (under ~1s in this browser; a person doesn't tap that fast), so the
// last swipe is given a moment before the ✕ is tapped.
const SETTLE_MS = 1000;

// The drawer closes with an animation: wait for it to be gone (up to 3s).
async function closedWithin(page, ms = 3000) {
  for (let t = 0; t < ms; t += 150) {
    if ((await page.locator(".drawer--is-open").count()) === 0) return true;
    await sleep(150);
  }
  return false;
}

async function contextFor(browser, cfg) {
  const { ctx } = await newContext(browser, {
    viewport: { width: cfg.w, height: cfg.h },
    hasTouch: cfg.touch,
    isMobile: cfg.touch && cfg.w < 1000 && cfg.platform !== "iPad",
    deviceScaleFactor: 1,
  });
  if (cfg.platform) await ctx.addInitScript((p) => Object.defineProperty(Navigator.prototype, "platform", { get: () => p }), cfg.platform);
  return ctx;
}

// The booking with the most filled-in content, so there's the most to scroll.
async function pickCard(page) {
  return page.evaluate(async () => {
    const res = await fetch("/hv-studio/api/inquiries?depth=1&limit=200&where[archived][not_equals]=true&where[inquiryType][equals]=booking");
    const { docs } = await res.json();
    const score = (d) =>
      Object.values(d).filter((v) => v !== null && v !== "" && v !== undefined && !(Array.isArray(v) && !v.length)).length +
      2 * (d.prepChecklist?.length ?? 0) +
      2 * (d.wrapupChecklist?.length ?? 0) +
      (d.notes ? 5 : 0);
    docs.sort((a, b) => score(b) - score(a));
    const d = docs[0];
    if (!d) return null;
    const name = (d.client && typeof d.client === "object" && d.client.name) || d.name;
    return { id: d.id, name, stage: d.stage };
  });
}

// Sum of every scroll offset outside the drawer: the "page behind".
const pageScroll = (page) =>
  page.evaluate(() => {
    let sum = window.scrollY;
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest(".drawer")) continue;
      sum += el.scrollTop + el.scrollLeft;
    }
    return sum;
  });

const drawerState = (page, generic = false) =>
  page.evaluate((generic) => {
    const s = document.querySelector(".drawer--is-open .drawer__content-children");
    const close = document.querySelector(".drawer--is-open .drawer__header__close");
    const last = generic ? (s.lastElementChild?.lastElementChild ?? s.lastElementChild) : s?.querySelector("[class*='drawerBody'] > :last-child");
    const vvH = window.visualViewport ? window.visualViewport.height : innerHeight;
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom) };
    };
    return {
      scrollTop: Math.round(s.scrollTop),
      overflows: s.scrollHeight > s.clientHeight + 2,
      atBottom: s.scrollTop + s.clientHeight >= s.scrollHeight - 2,
      closeVisible: !!close && box(close).top >= 0 && box(close).bottom <= vvH,
      lastVisible: !!last && box(last).bottom <= vvH + 1 && box(last).top >= 0,
    };
  }, generic);

// A real touch drag (trusted touchStart/touchMove/touchEnd through CDP), or
// the mouse wheel on desktop.
async function swipe(page, cdp, cfg, x, y, dy) {
  if (cfg.touch) {
    const steps = Math.max(4, Math.round(Math.abs(dy) / 20));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: Math.round(y + (dy * i) / steps) }] });
      await sleep(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -dy);
  }
  await sleep(450);
}

async function openBoard(page) {
  await page.goto(`${ADMIN}/kanban`, { waitUntil: "domcontentloaded" });
  await page.locator("[class*='mobileGroupHeader'], [class*='columns'] [class*='card']").filter({ visible: true }).first().waitFor({ timeout: 60000 });
  await sleep(1500);
}

async function openCard(page, cfg, card) {
  const mobile = await page.evaluate(() => innerWidth <= 768);
  if (mobile) {
    const header = page.locator("[class*='mobileGroupHeader']", { hasText: STAGE_LABELS[card.stage] }).first();
    if ((await header.getAttribute("aria-expanded")) !== "true") await header.tap();
    const row = page.locator("button[class*='mobileRow']", { hasText: card.name }).first();
    await row.scrollIntoViewIfNeeded();
    await row.tap();
  } else {
    // Scope to the card's own stage column: several cards share a client name.
    const column = page.locator("h3[class*='columnTitle']", { hasText: new RegExp("^" + STAGE_LABELS[card.stage] + "$", "i") }).locator("xpath=../..");
    const el = column.locator("[class*='card']", { hasText: card.name }).first();
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    // A tap/click without movement opens the card; dragging needs movement.
    if (cfg.touch) await page.touchscreen.tap(box.x + box.width / 2, box.y + 20);
    else await page.mouse.click(box.x + box.width / 2, box.y + 20);
  }
  await page.waitForSelector(".drawer--is-open .drawer__content-children", { timeout: 15000 });
  await sleep(600);
}

// Swipes up until the drawer's content stops moving or reaches its end.
async function scrollToEnd(page, cdp, cfg, generic) {
  const area = await page.evaluate(() => {
    const b = document.querySelector(".drawer--is-open .drawer__content-children").getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), top: Math.round(b.top), bottom: Math.round(Math.min(b.bottom, innerHeight)) };
  });
  const trail = [(await drawerState(page, generic)).scrollTop];
  for (let i = 0; i < 25; i++) {
    await swipe(page, cdp, cfg, area.x, Math.round(area.bottom - (area.bottom - area.top) * 0.2), -Math.round((area.bottom - area.top) * 0.5));
    const s = await drawerState(page, generic);
    trail.push(s.scrollTop);
    if (s.atBottom || (i > 2 && trail.at(-1) === trail.at(-2) && trail.at(-2) === trail.at(-3))) break;
  }
  return { area, trail, end: await drawerState(page, generic) };
}

async function cardDrawer(browser, cfg, card) {
  r.section(`card drawer, ${cfg.name}`);
  const ctx = await contextFor(browser, cfg);
  const page = await ctx.newPage();
  try {
    await openBoard(page);
    await openCard(page, cfg, card);
    const cdp = cfg.touch ? await ctx.newCDPSession(page) : null;
    const start = await drawerState(page);
    check("opens with its ✕ on screen", start.closeVisible);
    const pageBefore = await pageScroll(page);
    const { area, trail, end } = await scrollToEnd(page, cdp, cfg, false);
    if (start.overflows) {
      check("scrolls to its end, last item on screen", end.atBottom && end.lastVisible, `scrollTop ${trail.join(" → ")}`);
      check("✕ still on screen at the end", end.closeVisible);
      await swipe(page, cdp, cfg, area.x, area.top + 40, 150);
      check("scrolls back up", (await drawerState(page)).scrollTop < end.scrollTop);
    } else {
      check("everything fits without scrolling", end.lastVisible);
    }
    // Try to scroll the page behind through the backdrop strip.
    await swipe(page, cdp, cfg, 3, Math.round(cfg.h / 2), -200);
    await swipe(page, cdp, cfg, 3, Math.round(cfg.h / 2), 200);
    check("the page behind doesn't move", (await pageScroll(page)) === pageBefore);

    if (cfg.keyboard) {
      // An on-screen keyboard: focus Notes, then shrink the view by 45%.
      await page.evaluate(() => document.querySelector(".drawer--is-open textarea")?.focus());
      const kh = Math.round(cfg.h * 0.55);
      await page.setViewportSize({ width: cfg.w, height: kh });
      await sleep(600);
      let kEnd = await drawerState(page);
      for (let i = 0; i < 25 && !kEnd.atBottom; i++) {
        await swipe(page, cdp, cfg, area.x, Math.round(kh * 0.75), -Math.round(kh * 0.35));
        kEnd = await drawerState(page);
      }
      check("keyboard open: still reaches its end, last item on screen", kEnd.atBottom && kEnd.lastVisible);
      await page.screenshot({ path: `${shots}/${cfg.w}x${cfg.h}-keyboard.png` });
      await swipe(page, cdp, cfg, area.x, Math.round(kh * 0.35), Math.round(kh * 0.3));
      const kBack = await drawerState(page);
      check("keyboard open: scrolls back up, ✕ on screen", kBack.scrollTop < kEnd.scrollTop && kBack.closeVisible);
      check("keyboard open: Notes keeps focus", await page.evaluate(() => document.activeElement === document.querySelector(".drawer--is-open textarea")));
      await page.setViewportSize({ width: cfg.w, height: cfg.h });
      await sleep(400);
    }
    await page.screenshot({ path: `${shots}/${cfg.w}x${cfg.h}-card.png` });
    const close = page.locator(".drawer--is-open .drawer__header__close");
    await sleep(SETTLE_MS);
    if (cfg.touch) await close.tap();
    else await close.click();
    const closed = await closedWithin(page);
    if (!closed) await page.screenshot({ path: `${shots}/${cfg.w}x${cfg.h}-not-closed.png` });
    check("the ✕ closes it", closed);
  } catch (err) {
    check("ran without errors", false, String(err).split("\n")[0].slice(0, 300));
  }
  await ctx.close();
}

async function otherDrawers(browser, cfg) {
  r.section(`other drawers, ${cfg.name}`);
  const ctx = await contextFor(browser, cfg);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  try {
    await openBoard(page);
    for (const d of OTHER_DRAWERS) {
      try {
        await page.getByRole("button", { name: d.button }).first().tap();
        await page.waitForSelector(".drawer--is-open .drawer__content-children", { timeout: 15000 });
        await sleep(700);
        // Open collapsed sections inside (e.g. Questions' "Handled" list), so
        // there's as much to scroll as the real data allows.
        for (const t of await page.locator(".drawer--is-open .drawer__content-children button[aria-expanded='false']").all()) {
          await t.tap().catch(() => {});
          await sleep(200);
        }
        await sleep(400);
        const start = await drawerState(page, true);
        const before = await pageScroll(page);
        const { trail, end } = await scrollToEnd(page, cdp, cfg, true);
        if (start.overflows) check(`${d.name}: scrolls to its end`, end.atBottom, `scrollTop ${trail.join(" → ")}`);
        else check(`${d.name}: fits without scrolling`, true);
        check(`${d.name}: ✕ on screen`, end.closeVisible);
        await swipe(page, cdp, cfg, 3, Math.round(cfg.h / 2), -200);
        check(`${d.name}: the page behind doesn't move`, (await pageScroll(page)) === before);
        await sleep(SETTLE_MS);
        await page.locator(".drawer--is-open .drawer__header__close").tap();
        check(`${d.name}: the ✕ closes it`, await closedWithin(page));
      } catch (err) {
        check(`${d.name}: ran without errors`, false, String(err).split("\n")[0].slice(0, 300));
        await page.keyboard.press("Escape").catch(() => {});
        await sleep(500);
      }
    }
  } catch (err) {
    check("ran without errors", false, String(err).split("\n")[0].slice(0, 300));
  }
  await ctx.close();
}

(async () => {
  // Always a visible browser: Playwright's headless shell drops the click of
  // a tap that follows these touch drags (the ✕ then seems not to work),
  // which a real browser doesn't.
  const browser = await launchBrowser({ headless: false });
  const ctx = await contextFor(browser, CONFIGS.at(-1));
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/kanban`, { waitUntil: "domcontentloaded" });
  const card = await pickCard(page);
  await ctx.close();
  if (!check("a booking to open", Boolean(card), "no booking on the board")) throw new Error("no booking to test with");
  r.lines.push(`(using "${card.name}", ${STAGE_LABELS[card.stage]})`);
  for (const cfg of only(CONFIGS)) await cardDrawer(browser, cfg, card);
  for (const cfg of only(OTHER_CONFIGS)) await otherDrawers(browser, cfg);
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
