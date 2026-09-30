// Every drawer and modal in the studio scrolls by touch on an iPhone, in
// WebKit (Safari's engine) with an iPhone profile, portrait 390x844 and
// landscape 844x390.
//
// The bug this guards against: Payload's drawers and modals lock the page
// behind them with body-scroll-lock, which on iPhones cancels every
// touchmove except inside the one element it was given, the drawer's outer
// dialog. That element never scrolls, so no swipe inside a drawer did
// either. components/admin/ModalTouchScroll.tsx fixes it for all of
// them at once.
//
// Playwright can't make a real touch drag in WebKit, so each drawer is
// checked the way the bug works: a touchmove (with the fields the lock
// reads) sent inside the drawer's scrolling area must not be cancelled,
// which is what lets Safari scroll it; one sent outside it (the page
// behind) still must be. Then the area is scrolled to its end, which must
// be on screen, and the close button must be reachable. body-scroll-lock
// decides "iPhone" from navigator.platform, which Playwright's WebKit on
// Windows reports as Win32, so it's set to "iPhone" as on a real one.
//
// Reads the live data; every write is faked. The opener for each drawer is
// below; some need data that may not exist (e.g. an unused photo), and say
// so rather than fail.
const { launchBrowser, newContext, report, outDir, sleep, ADMIN } = require("./lib/harness.cjs");
const { devices } = require("playwright");

const r = report("drawer-touch-scroll");
const { check } = r;
const shots = outDir("drawer-touch-scroll");
const SIZES = [
  { name: "390x844 portrait", width: 390, height: 844 },
  { name: "844x390 landscape", width: 844, height: 390 },
];

const tapText = (page, name) => page.getByRole("button", { name, exact: true }).first().tap();

// How to open each drawer or modal, starting from a fresh page.
const DRAWERS = [
  {
    name: "Edit photo details (album grid)",
    open: async (page) => {
      await page.goto(`${ADMIN}/collections/events/16`);
      await page.locator(".album-photos__tile").first().waitFor({ timeout: 90000 });
      await page.locator(".album-photos__tile").first().locator(".album-photos__menu-button").tap();
      await tapText(page, "Edit photo details");
    },
  },
  {
    name: "Edit photo details (Unused photos)",
    open: async (page) => {
      await page.goto(`${ADMIN}/portfolio#unused-photos`);
      const tile = page.locator("#unused-photos .unused-photos__photo").first();
      if (!(await tile.waitFor({ timeout: 60000 }).then(() => true, () => false))) return "no unused photo to open";
      await tile.tap();
    },
  },
  {
    name: "Add existing photos (album page)",
    open: async (page) => {
      await page.goto(`${ADMIN}/collections/events/16`);
      await page.locator(".album-photos__tile").first().waitFor({ timeout: 90000 });
      await tapText(page, "Add existing photos");
      await page.locator(".add-photos__photo").first().waitFor({ timeout: 30000 });
    },
  },
  {
    name: "Add to album (Unused photos)",
    open: async (page) => {
      await page.goto(`${ADMIN}/portfolio#unused-photos`);
      const menu = page.locator("#unused-photos .unused-photos__menu-button").first();
      if (!(await menu.waitFor({ timeout: 60000 }).then(() => true, () => false))) return "no unused photo to add";
      await menu.tap();
      await tapText(page, "Add to album…");
      await page.locator(".album-picker__album").first().waitFor({ timeout: 30000 });
    },
  },
  {
    name: "Move to Trash confirmation (Unused photos)",
    open: async (page) => {
      await page.goto(`${ADMIN}/portfolio#unused-photos`);
      const menu = page.locator("#unused-photos .unused-photos__menu-button").first();
      if (!(await menu.waitFor({ timeout: 60000 }).then(() => true, () => false))) return "no unused photo";
      await menu.tap();
      await tapText(page, "Move to Trash");
    },
  },
  {
    name: "Upload field: Choose from existing (Site Settings)",
    open: async (page) => {
      await page.goto(`${ADMIN}/globals/site-settings`);
      await page.getByRole("button", { name: "Choose from existing" }).first().waitFor({ timeout: 90000 });
      await page.getByRole("button", { name: "Choose from existing" }).first().tap();
      await page.locator(".payload__modal-item table, .payload__modal-item .no-results").first().waitFor({ timeout: 30000 });
    },
  },
  {
    name: "Upload field: Create New (Site Settings)",
    open: async (page) => {
      await page.goto(`${ADMIN}/globals/site-settings`);
      await page.getByRole("button", { name: "Create New" }).first().waitFor({ timeout: 90000 });
      await page.getByRole("button", { name: "Create New" }).first().tap();
      await page.locator(".payload__modal-item #field-alt").waitFor({ timeout: 30000 });
    },
  },
  {
    name: "Hero slide image: Choose from existing (Hook)",
    open: async (page) => {
      await page.goto(`${ADMIN}/globals/hero`);
      await page.getByRole("button", { name: "Choose from existing" }).first().waitFor({ timeout: 90000 });
      await page.getByRole("button", { name: "Choose from existing" }).first().tap();
      await page.locator(".payload__modal-item table, .payload__modal-item .no-results").first().waitFor({ timeout: 30000 });
    },
  },
  {
    name: "Kanban: card",
    open: async (page) => {
      await page.goto(`${ADMIN}/kanban`);
      await page.locator("[class*='mobileGroupHeader'], [class*='columns'] [class*='card']").filter({ visible: true }).first().waitFor({ timeout: 90000 });
      await sleep(1000);
      if (await page.evaluate(() => innerWidth <= 768)) {
        const header = page.locator("[class*='mobileGroupHeader'][aria-expanded='false']").first();
        if (await header.count()) await header.tap();
        await page.locator("button[class*='mobileRow']").first().tap();
      } else {
        const box = await page.locator("[class*='columns'] [class*='card']").filter({ visible: true }).first().boundingBox();
        await page.touchscreen.tap(box.x + box.width / 2, box.y + 20);
      }
    },
  },
  ...["+ Add Card", "Questions", "Templates"].map((button) => ({
    name: `Kanban: ${button.replace("+ ", "")}`,
    open: async (page) => {
      await page.goto(`${ADMIN}/kanban`);
      const btn = page.getByRole("button", { name: new RegExp(`^${button.replace("+", "\\+")}`) }).first();
      await btn.waitFor({ timeout: 90000 });
      await sleep(800);
      await btn.tap();
    },
  })),
];

// Measures the top open drawer/modal: its main scrolling area, whether a
// touchmove inside it / outside it is cancelled, its end, its close button.
async function measure(page) {
  return page.evaluate(() => {
    const dialogs = [...document.querySelectorAll(".payload__modal-container > .payload__modal-item")];
    const dialog = dialogs.at(-1);
    if (!dialog) return { error: "no drawer or modal open" };
    const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
    const vw = innerWidth;
    const scrollers = [...dialog.querySelectorAll("*")]
      .filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 2)
      .sort((a, b) => b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight));
    const scroller = scrollers[0] ?? null;

    const touch = (type, target, x, y) => {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      const t = [{ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y }];
      const ended = type === "touchend";
      Object.defineProperty(ev, "touches", { value: ended ? [] : t });
      Object.defineProperty(ev, "targetTouches", { value: ended ? [] : t });
      Object.defineProperty(ev, "changedTouches", { value: t });
      return ev;
    };
    // A short upward drag from (x, y); returns whether its touchmove was cancelled.
    const drag = (x, y) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return { target: null, cancelled: null };
      el.dispatchEvent(touch("touchstart", el, x, y));
      const move = touch("touchmove", el, x, y - 60);
      el.dispatchEvent(move);
      el.dispatchEvent(touch("touchend", el, x, y - 60));
      return { target: `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).split(" ")[0]}`, cancelled: move.defaultPrevented, inScroller: !!scroller && scroller.contains(el) };
    };

    const out = { kind: dialog.className.split(" ").find((c) => /drawer|modal/.test(c) && !c.startsWith("payload__")) ?? "modal", scrolls: !!scroller };
    const pageBefore = window.scrollY;
    if (scroller) {
      scroller.scrollTop = 0;
      const b = scroller.getBoundingClientRect();
      const x = Math.round(Math.max(b.left, 0) + Math.min(b.width, vw) / 2);
      const y = Math.round(Math.min(b.bottom, vh) - Math.min(b.height, vh) * 0.25);
      out.inside = drag(x, y);
      scroller.scrollTop = scroller.scrollHeight;
      const end = scroller.getBoundingClientRect();
      out.endOnScreen = end.bottom <= vh + 1 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      out.endBox = `${Math.round(end.top)}..${Math.round(end.bottom)} of ${Math.round(vh)}`;
    }
    // The page behind: a drag on the backdrop strip at the far left (or,
    // where the panel fills the screen, the page is simply locked).
    out.behind = drag(2, Math.round(vh / 2));
    out.pageMoved = window.scrollY !== pageBefore;
    out.bodyLocked = getComputedStyle(document.body).position === "fixed" || getComputedStyle(document.body).overflow === "hidden";

    // A way out on screen: the header's close button, or a Cancel.
    const closers = [...dialog.querySelectorAll(".drawer__header__close, .doc-drawer__header-close, button[aria-label='Close'], .drawer__close-button, .confirmation-modal button")]
      .filter((b) => b.offsetParent !== null && !b.classList.contains("drawer__close"));
    const onScreen = (b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.top >= 0 && r.bottom <= vh + 1 && r.left >= 0 && r.right <= vw + 1;
    };
    out.closeAtEnd = closers.some(onScreen);
    if (scroller) scroller.scrollTop = 0;
    out.closeAtTop = closers.some(onScreen);
    out.closeCount = closers.length;
    // Stuck part-way through the drawer's fade-and-slide-in (seen in
    // Playwright's WebKit for the kanban card drawer: opacity and offset
    // frozen, nothing animating), which leaves the close button off to the side.
    const panel = dialog.querySelector(".drawer__content");
    out.stuckOpening = !!panel && Number(getComputedStyle(panel).opacity) < 1 && panel.getAnimations().length === 0;
    out.closeBoxes = closers.map((b) => { const r = b.getBoundingClientRect(); return `${b.className.split(" ")[0]} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`; }).join("; ");
    return out;
  });
}

async function run(browser, size) {
  const ctx = (
    await newContext(browser, { ...devices["iPhone 14"], viewport: { width: size.width, height: size.height } })
  ).ctx;
  // body-scroll-lock's iPhone check (see top).
  await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, "platform", { get: () => "iPhone" }));
  for (const drawer of DRAWERS) {
    r.section(`${drawer.name}, ${size.name}`);
    const page = await ctx.newPage();
    try {
      const skip = await drawer.open(page);
      if (typeof skip === "string") {
        r.lines.push(`(skipped: ${skip})`);
        await page.close();
        continue;
      }
      await page.locator(".payload__modal-container > .payload__modal-item").last().waitFor({ timeout: 30000 });
      // Drawers fade and slide in: measure once the last one has settled
      // (fully opaque, no offset left), or a close button is still off to the side.
      await page
        .waitForFunction(
          () => {
            const d = [...document.querySelectorAll(".payload__modal-container > .payload__modal-item")].at(-1);
            const panel = d?.querySelector(".drawer__content") ?? d;
            if (!panel) return false;
            const cs = getComputedStyle(panel);
            return cs.opacity === "1" && (cs.transform === "none" || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(cs.transform));
          },
          null,
          { timeout: 15000 },
        )
        .catch(() => {});
      await sleep(800);
      const m = await measure(page);
      if (m.error) throw new Error(m.error);
      if (m.scrolls) {
        check("a swipe inside it isn't cancelled (it scrolls)", m.inside.inScroller && m.inside.cancelled === false, m.inside);
        check("its end comes on screen", m.endOnScreen, m.endBox);
      } else {
        check("everything fits without scrolling", true);
      }
      check("the page behind stays put (a swipe behind is cancelled)", m.behind.cancelled !== false && !m.pageMoved && m.bodyLocked, { ...m.behind, pageMoved: m.pageMoved, bodyLocked: m.bodyLocked });
      if (!(m.closeAtEnd || m.closeAtTop) && m.stuckOpening) {
        r.known("close button off to the side: the drawer's open animation froze part-way (WebKit)", m.closeBoxes);
      } else check("a close button is reachable", m.closeAtEnd || m.closeAtTop, `${m.closeAtEnd ? "on screen at the end" : m.closeAtTop ? "back at the top" : "not on screen"}: ${m.closeBoxes || "none found"}`);
      await page.screenshot({ path: `${shots}/${drawer.name.replace(/[^a-z0-9]+/gi, "-")}-${size.width}x${size.height}.png` });
    } catch (err) {
      check("opened and measured", false, String(err).split("\n")[0].slice(0, 240));
    }
    await page.close();
  }
  await ctx.close();
}

// Real touch drags, in Chromium set up as an iPhone (trusted touch events
// through its input pipeline, which WebKit can't do here): the drawer
// really scrolls to its end, the page behind doesn't move, the close
// button is reachable. The kanban drawers have their own real-drag test
// (card-drawer-scroll.test.cjs). A visible browser, as there: the headless
// one mishandles taps after these drags.
const REAL_SWIPE = DRAWERS.filter((d) => !d.name.startsWith("Kanban") && !d.name.includes("confirmation"));

async function realSwipes(browser, size) {
  const { ctx } = await newContext(browser, { viewport: { width: size.width, height: size.height }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, "platform", { get: () => "iPhone" }));
  for (const drawer of REAL_SWIPE) {
    r.section(`real swipes (Chromium as iPhone): ${drawer.name}, ${size.name}`);
    const page = await ctx.newPage();
    try {
      const skip = await drawer.open(page);
      if (typeof skip === "string") {
        r.lines.push(`(skipped: ${skip})`);
        await page.close();
        continue;
      }
      await page.locator(".payload__modal-container > .payload__modal-item").last().waitFor({ timeout: 30000 });
      await sleep(1500);
      const cdp = await ctx.newCDPSession(page);
      const info = await page.evaluate(() => {
        const dialog = [...document.querySelectorAll(".payload__modal-container > .payload__modal-item")].at(-1);
        const scroller = [...dialog.querySelectorAll("*")]
          .filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 2)
          .sort((a, b) => b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight))[0];
        if (!scroller) return null;
        scroller.setAttribute("data-test-scroller", "");
        const b = scroller.getBoundingClientRect();
        return { x: Math.round(b.left + b.width / 2), top: Math.round(Math.max(b.top, 0)), bottom: Math.round(Math.min(b.bottom, innerHeight)) };
      });
      if (!info) {
        check("everything fits without scrolling", true);
        await page.close();
        continue;
      }
      const state = () =>
        page.evaluate(() => {
          const s = document.querySelector("[data-test-scroller]");
          return { top: Math.round(s.scrollTop), atEnd: s.scrollTop + s.clientHeight >= s.scrollHeight - 2, page: window.scrollY };
        });
      const swipe = async (x, y, dy) => {
        const steps = Math.max(4, Math.round(Math.abs(dy) / 20));
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let i = 1; i <= steps; i++) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: Math.round(y + (dy * i) / steps) }] });
          await sleep(16);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await sleep(450);
      };
      const start = await state();
      const trail = [start.top];
      const y = Math.round(info.bottom - (info.bottom - info.top) * 0.2);
      const dist = -Math.round((info.bottom - info.top) * 0.5);
      for (let i = 0; i < 30; i++) {
        await swipe(info.x, y, dist);
        const st = await state();
        trail.push(st.top);
        if (st.atEnd || (i > 2 && trail.at(-1) === trail.at(-2) && trail.at(-2) === trail.at(-3))) break;
      }
      const end = await state();
      check("swiping scrolls it to its end", end.atEnd && end.top > start.top, `scrollTop ${trail.join(" → ")}`);
      await swipe(2, Math.round(size.height / 2), -200);
      check("the page behind doesn't move", (await state()).page === start.page);
      await swipe(info.x, info.top + 60, Math.round((info.bottom - info.top) * 0.6));
      check("swiping back up works", (await state()).top < end.top);
      await page.screenshot({ path: `${shots}/real-${drawer.name.replace(/[^a-z0-9]+/gi, "-")}-${size.width}x${size.height}.png` });
    } catch (err) {
      check("opened and swiped", false, String(err).split(/\r?\n/)[0].slice(0, 240));
    }
    await page.close();
  }
  await ctx.close();
}

(async () => {
  const webkitBrowser = await launchBrowser({ engine: "webkit" });
  for (const size of SIZES) await run(webkitBrowser, size);
  await webkitBrowser.close();
  const chromium = await launchBrowser({ headless: false });
  for (const size of SIZES) await realSwipes(chromium, size);
  await chromium.close();
})().then(() => r.finish(), (err) => r.finish(err));
