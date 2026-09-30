// The kanban board's Calendar view at seven screen sizes, against the live
// bookings (every write faked):
//   - every week of the month is reachable (nothing cut off by a box she
//     can't scroll);
//   - phones and small screens get the compact view: each day shows exactly
//     its events as markers (dot confirmed shoot, ring unconfirmed, diamond
//     delivery; "+N" past what fits) and every day is a button saying what's
//     on; today is selected on load; tapping a day lists its events below the
//     grid, and a row opens that client's card; an empty day says "Nothing
//     scheduled" with a "Next:" to the next day with events; another month
//     starts with nothing selected and Today brings today back;
//   - larger screens get the full grid, where an event chip opens its card;
//   - a crowded day (five events swapped onto one day of this month, in the
//     page's data only): "+N", nothing spills out of the cell, its week keeps
//     one height, and its day's list shows all five.
const { launchBrowser, newContext, report, outDir, sleep, ADMIN } = require("./lib/harness.cjs");

const r = report("calendar");
const { check } = r;
const shots = outDir("calendar");

const CONFIGS = [
  { name: "375x667", w: 375, h: 667, touch: true, platform: "iPhone" },
  { name: "390x844", w: 390, h: 844, touch: true, platform: "iPhone" },
  { name: "844x390", w: 844, h: 390, touch: true, platform: "iPhone" },
  { name: "820x1180", w: 820, h: 1180, touch: true, platform: "iPad" },
  { name: "1024x768", w: 1024, h: 768, touch: true, platform: "iPad" },
  { name: "1280x600", w: 1280, h: 600, touch: false },
  { name: "1440x900", w: 1440, h: 900, touch: false },
];

async function contextFor(browser, cfg) {
  const { ctx } = await newContext(browser, {
    viewport: { width: cfg.w, height: cfg.h },
    hasTouch: cfg.touch,
    isMobile: cfg.touch && cfg.platform === "iPhone",
  });
  if (cfg.platform) await ctx.addInitScript((p) => Object.defineProperty(Navigator.prototype, "platform", { get: () => p }), cfg.platform);
  return ctx;
}

async function openCalendar(page, tap) {
  await page.getByRole("button", { name: "Calendar", exact: true }).first().waitFor({ timeout: 60000 });
  await sleep(1200);
  await tap(page.getByRole("button", { name: "Calendar", exact: true }).first());
  await page.locator("[class*='calendarGrid']").first().waitFor({ timeout: 15000 });
  await sleep(800);
}

async function oneSize(browser, cfg) {
  r.section(cfg.name);
  const ctx = await contextFor(browser, cfg);
  const page = await ctx.newPage();
  const tap = (loc) => (cfg.touch ? loc.tap() : loc.click());
  try {
    await page.goto(`${ADMIN}/kanban`, { waitUntil: "domcontentloaded" });
    await openCalendar(page, tap);

    // Every week reachable: none cut off by a box she can't scroll
    // (overflow hidden or clip). Inside scrollable boxes it's reachable.
    const weeks = await page.evaluate(() => {
      const grid = document.querySelector("[class*='calendarGrid']");
      for (let el = grid; el; el = el.parentElement) el.scrollTop = 0;
      window.scrollTo(0, 0);
      const days = [...grid.children];
      const res = [];
      for (let i = 0; i < days.length; i += 7) {
        const b = days[i].getBoundingClientRect();
        let clipped = false;
        for (let a = days[i].parentElement; a && a !== document.documentElement; a = a.parentElement) {
          const oy = getComputedStyle(a).overflowY;
          if (oy === "hidden" || oy === "clip") {
            const ab = a.getBoundingClientRect();
            if (b.top >= ab.bottom - 1 || b.bottom > ab.bottom + 1) clipped = true;
          }
        }
        res.push(!clipped);
      }
      return res;
    });
    check("every week of the month is reachable", weeks.every(Boolean), weeks.map((ok) => (ok ? "ok" : "CUT OFF")).join(", "));
    await page.screenshot({ path: `${shots}/${cfg.name}-top.png` });

    const expectCompact = cfg.w <= 768 || cfg.h <= 500;
    const compact = await page.evaluate(() => !!document.querySelector("[class*='calendarCompact']"));
    check(`${expectCompact ? "compact" : "full"} view at this size`, compact === expectCompact);

    if (expectCompact) {
      // Each day's markers and label against the bookings (the app's rule:
      // a date's calendar day; every day is a button, its label says what's on).
      const expected = await page.evaluate(async () => {
        const res = await fetch("/hv-studio/api/inquiries?" + new URLSearchParams({ "where[archived][not_equals]": "true", "where[inquiryType][equals]": "booking", depth: "0", limit: "500" }));
        const { docs } = await res.json();
        const byDay = {};
        const add = (v, kind) => {
          if (!v) return;
          (byDay[new Date(v).toISOString().slice(0, 10)] ||= []).push(kind);
        };
        for (const d of docs) {
          add(d.shootDate, d.shootDateConfirmed ? "dot" : "ring");
          add(d.deliveryDeadline, "diamond");
        }
        return byDay;
      });
      const markers = await page.evaluate((expected) => {
        const grid = document.querySelector("[class*='calendarGrid']");
        const first = new Date("1 " + document.querySelector("[class*='calendarMonthLabel']").textContent.trim());
        const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
        const problems = [];
        let days = 0;
        [...grid.children].forEach((cell, i) => {
          const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const exp = expected[key] || [];
          const spans = [...cell.querySelectorAll("[class*='calendarMarkers'] > span")];
          const more = spans.find((m) => String(m.className).includes("calendarMarkerMore"));
          const shapes = spans.filter((m) => m !== more).map((m) => (String(m.className).includes("Diamond") ? "diamond" : String(m.className).includes("Ring") ? "ring" : "dot"));
          const shown = shapes.length + (more ? Number(more.textContent.replace("+", "")) : 0);
          if (shown !== exp.length) problems.push(`${key}: shows ${shown}, expected ${exp.length}`);
          const label = cell.getAttribute("aria-label") || "";
          const wantLabel = exp.length === 0 ? ": nothing scheduled" : `: ${exp.length} ${exp.length === 1 ? "event" : "events"}`;
          if (cell.tagName !== "BUTTON" || !label.endsWith(wantLabel)) problems.push(`${key}: "${label}" (a ${cell.tagName})`);
          if (shapes.slice().sort().join() !== exp.slice(0, shapes.length).sort().join()) problems.push(`${key}: ${shapes} vs ${exp}`);
          if (exp.length) days++;
        });
        return { days, problems };
      }, expected);
      check("each day shows exactly its events, and says so", markers.problems.length === 0, markers.problems.length ? markers.problems.slice(0, 4).join("; ") : `${markers.days} days with events`);

      const panel = page.locator("section[class*='calendarDayPanel']");
      const selected = () => page.evaluate(() => [...document.querySelectorAll("[class*='calendarGrid'] button[aria-pressed='true']")].map((b) => b.getAttribute("aria-label")));
      const todayLabel = await page.evaluate(() => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
      let sel = await selected();
      check("today is selected on load", sel.length === 1 && sel[0].startsWith(`${todayLabel}:`), sel.join(" | "));
      check("the page doesn't jump on load", (await page.evaluate(() => window.scrollY)) === 0);

      // A day with events: its rows, and a row opens that client's card.
      const busyDay = page.locator("[class*='calendarGrid'] button[aria-label$='event'], [class*='calendarGrid'] button[aria-label$='events']").first();
      if ((await busyDay.count()) === 0) {
        r.lines.push("(no events this month: day and row taps skipped)");
      } else {
        const label = await busyDay.getAttribute("aria-label");
        const count = Number(label.match(/: (\d+) event/)[1]);
        await tap(busyDay);
        await sleep(700);
        sel = await selected();
        const rows = panel.locator("li button");
        const panelBox = await panel.boundingBox();
        check("tapping a day selects it and lists its events", sel[0] === label && (await rows.count()) === count, `${label}: ${await rows.count()} rows`);
        check("the day's list is on screen", panelBox && panelBox.y < cfg.h, `panel top ${Math.round(panelBox?.y ?? -1)}`);
        await page.screenshot({ path: `${shots}/${cfg.name}-tapped-day.png` });
        await tap(busyDay);
        await sleep(400);
        check("tapping the selected day again keeps it", (await selected())[0] === label);
        const rowName = (await rows.first().locator("[class*='calendarDayPanelName']").textContent()).trim();
        await rows.first().scrollIntoViewIfNeeded();
        await tap(rows.first());
        await page.waitForSelector(".drawer--is-open .drawer__header__title", { timeout: 15000 });
        await sleep(600);
        const title = (await page.locator(".drawer--is-open .drawer__header__title").textContent()).trim();
        check("a row opens that client's card", title === rowName, `${rowName} → ${title}`);
        await tap(page.locator(".drawer--is-open .drawer__header__close"));
        await sleep(600);
        check("the card closes again", (await page.locator(".drawer--is-open").count()) === 0);
      }

      // An empty day: "Nothing scheduled", and "Next:" jumps to the next day with events.
      const emptyDay = page.locator("[class*='calendarGrid'] button[aria-label$=': nothing scheduled']").first();
      await tap(emptyDay);
      await sleep(600);
      check("an empty day says Nothing scheduled", /Nothing scheduled/.test(await panel.innerText()));
      const next = panel.getByRole("button", { name: /^Next:/ });
      if (await next.count()) {
        const nextText = (await next.innerText()).replace(/\s+/g, " ");
        await tap(next);
        await sleep(800);
        sel = await selected();
        const heading = await panel.locator("h3").innerText();
        check("Next: selects the next day with events and lists them", sel.length === 1 && !sel[0].endsWith("nothing scheduled") && (await panel.locator("li button").count()) > 0, `${nextText} → ${heading}`);
      } else {
        r.lines.push("(nothing scheduled after that day: Next: skipped)");
      }

      // Another month: nothing selected; Today brings today back.
      await tap(page.getByRole("button", { name: "Today", exact: true }));
      await sleep(400);
      await tap(page.getByRole("button", { name: "Next month" }));
      await sleep(500);
      check("another month starts with nothing selected", (await selected()).length === 0 && /Tap a day/.test(await panel.innerText()));
      await tap(page.getByRole("button", { name: "Today", exact: true }));
      await sleep(500);
      sel = await selected();
      check("Today brings today back, selected", sel.length === 1 && sel[0].startsWith(`${todayLabel}:`), sel.join(" | "));
      const scrollers = await page.evaluate(() =>
        [...document.querySelectorAll("section[class*='calendarDayPanel'], section[class*='calendarDayPanel'] *")].filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY)).length,
      );
      check("the day's list has no scroll box of its own", scrollers === 0);
    } else {
      const chip = page.locator("[class*='calendarEventChip']").first();
      if ((await chip.count()) === 0) {
        r.lines.push("(no events this month: chip tap skipped)");
      } else {
        const chipTitle = await chip.getAttribute("title");
        await chip.scrollIntoViewIfNeeded();
        await tap(chip);
        await page.waitForSelector(".drawer--is-open .drawer__header__title", { timeout: 15000 });
        await sleep(600);
        const title = (await page.locator(".drawer--is-open .drawer__header__title").textContent()).trim();
        check("an event chip opens that client's card", (chipTitle || "").includes(title), `${chipTitle} → ${title}`);
        await tap(page.locator(".drawer--is-open .drawer__header__close"));
        await sleep(600);
        check("the card closes again", (await page.locator(".drawer--is-open").count()) === 0);
      }
    }
  } catch (err) {
    check("ran without errors", false, String(err).split("\n")[0].slice(0, 300));
  }
  await ctx.close();
}

// Five events on one day this month, swapped into the board's data (read
// on a client-side navigation) in this browser only.
async function crowdedDay(browser) {
  const cfg = CONFIGS[0];
  r.section(`${cfg.name}, five events on one day`);
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), 24);
  const target = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-24`;
  const ariaStart = day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const ctx = await contextFor(browser, cfg);
  let rewritten = 0;
  await ctx.route(`${ADMIN}/kanban**`, async (route) => {
    const req = route.request();
    if (req.method() !== "GET" || req.resourceType() === "document" || !req.headers()["rsc"] || rewritten) return route.fallback();
    const res = await route.fetch();
    const body = (await res.text()).replace(/(\\*"(?:shootDate|deliveryDeadline)\\*":\\*")(\d{4}-\d{2}-\d{2})/g, (m, pre) => (rewritten >= 5 ? m : (rewritten++, pre + target)));
    await route.fulfill({ response: res, body });
  });
  const page = await ctx.newPage();
  try {
    // Start elsewhere, then go to the board client-side.
    await page.goto(`${ADMIN}/collections/users`, { waitUntil: "domcontentloaded" });
    await page.locator("a.site-nav__label", { hasText: "Kanban Board" }).first().waitFor({ state: "attached", timeout: 60000 });
    await sleep(1500);
    await page.evaluate(() => [...document.querySelectorAll("a.site-nav__label")].find((a) => a.textContent === "Kanban Board").click());
    await page.waitForURL(/\/hv-studio\/kanban/, { timeout: 60000 });
    await openCalendar(page, (loc) => loc.tap());
    check("five events moved onto one day (in the page's data)", rewritten === 5, `${rewritten} moved to ${target}`);
    const cell = page.locator(`[class*='calendarGrid'] button[aria-label^='${ariaStart}']`);
    const info = await cell.evaluate((el) => {
      const spans = [...el.querySelectorAll("[class*='calendarMarkers'] > span")];
      const more = spans.find((m) => String(m.className).includes("calendarMarkerMore"));
      const cb = el.getBoundingClientRect();
      const inside = [...el.querySelectorAll("*")].every((c) => {
        const b = c.getBoundingClientRect();
        return b.left >= cb.left - 0.5 && b.right <= cb.right + 0.5 && b.top >= cb.top - 0.5 && b.bottom <= cb.bottom + 0.5;
      });
      const cells = [...el.parentElement.children];
      const i = cells.indexOf(el);
      const week = cells.slice(i - (i % 7), i - (i % 7) + 7);
      return {
        markers: spans.length - (more ? 1 : 0),
        more: more?.textContent ?? null,
        fits: el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight && inside,
        weekHeights: [...new Set(week.map((c) => Math.round(c.getBoundingClientRect().height)))],
      };
    });
    check('a crowded day shows "+N" for what doesn\'t fit', Boolean(info.more) && info.markers + Number(info.more.replace("+", "")) >= 5, info);
    check("nothing spills out of the day's cell", info.fits);
    check("its week keeps one height", info.weekHeights.length === 1, info.weekHeights.join(", "));
    await page.screenshot({ path: `${shots}/crowded-day.png` });
    await cell.tap();
    await sleep(900);
    const panel = page.locator("section[class*='calendarDayPanel']");
    const rows = await panel.locator("li button").count();
    const pressed = await cell.getAttribute("aria-pressed");
    check("its day's list shows all five events", rows >= 5 && pressed === "true", `${rows} rows`);
  } catch (err) {
    check("ran without errors", false, String(err).split("\n")[0].slice(0, 300));
  }
  await ctx.close();
}

(async () => {
  const browser = await launchBrowser();
  for (const cfg of CONFIGS) await oneSize(browser, cfg);
  await crowdedDay(browser);
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
