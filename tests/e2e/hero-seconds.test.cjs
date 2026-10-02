// The Hook (Hero) editor's "Seconds per photo" (globals/Hero.ts,
// HeroSecondsField.tsx): a slider from 2 to 10 seconds in half seconds with
// its value shown, its help text and place; Live Preview's hero following a
// new value straight away (the active bar's fill and the actual change of
// slide); the crossfade staying 1200ms; the homepage using the saved value;
// reduced motion still never rotating; and what Publish would send.
//
// Every write is faked by the shared guard (lib/guard.cjs); nothing is saved.
// Run with `npm run test:e2e hero-seconds` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, BASE, ADMIN, API } = require("./lib/harness.cjs");

const r = report("hero-seconds");
const { check, section } = r;
const shots = outDir("hero-seconds");
const HELP = "How long each photo stays before the next one fades in.";

const slider = (page) => page.locator("#field-secondsPerPhoto");
const shown = async (page) => (await page.locator(".hero-seconds__value").innerText()).trim();

// The hero's state in a page or frame: the active bar's fill duration, which
// slide is current, and the crossfade.
const heroState = (target) =>
  target.locator("#top").evaluate((top) => {
    const fill = top.querySelector(".hero-indicator-fill--animated");
    const bars = [...top.querySelectorAll(".hero-indicators button[aria-current]")];
    const layer = top.querySelector("[style*='hero-fade-duration']");
    return {
      fillMs: fill ? fill.style.animationDuration : null,
      active: [...top.querySelectorAll(".hero-indicators button")].findIndex((b) => b.getAttribute("aria-current") === "true"),
      bars: bars.length,
      fade: getComputedStyle(document.documentElement).getPropertyValue("--hero-fade-duration").trim(),
      fadeUsed: layer ? layer.style.transition : null,
      pause: !!top.querySelector("button[aria-label$='the slideshow']"),
    };
  });

// Slider to a value with the keyboard (Home = 2, then a step per arrow).
async function setSeconds(page, seconds) {
  await slider(page).focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < (seconds - 2) / 0.5; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await launchBrowser();
  const errors = [];
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const saved = await (await page.request.get(`${API}/globals/hero?depth=0`)).json();
  r.lines.push(`(saved: ${saved.secondsPerPhoto}s per photo, ${(saved.slides || []).length} slides)`);
  check("saved value after the migration is 4.5", saved.secondsPerPhoto === 4.5, saved.secondsPerPhoto);

  section("the setting, 1440x950");
  await page.goto(`${ADMIN}/globals/hero`, { timeout: 120000 });
  await slider(page).waitFor({ timeout: 60000 });
  await page.waitForTimeout(2000);
  const field = page.locator(".hero-seconds");
  check("label: Seconds per photo", (await field.locator(".field-label").innerText()).replace(/\*/g, "").trim() === "Seconds per photo", await field.locator(".field-label").innerText());
  check("help text", (await field.locator(".field-description").innerText()).trim() === HELP, await field.locator(".field-description").innerText());
  const attrs = await slider(page).evaluate((el) => ({ type: el.type, min: el.min, max: el.max, step: el.step, value: el.value }));
  check("a slider from 2 to 10 in half seconds", attrs.type === "range" && attrs.min === "2" && attrs.max === "10" && attrs.step === "0.5", attrs);
  check("starts at 4.5, shown as 4.5 seconds", attrs.value === "4.5" && (await shown(page)) === "4.5 seconds", { attrs, shown: await shown(page) });
  check("comes right after Hero slides", await page.evaluate(() => {
    const fields = [...document.querySelectorAll(".render-fields > .field-type, .document-fields .render-fields > *")];
    const i = fields.findIndex((f) => f.classList.contains("hero-seconds"));
    return i > 0 && /slides/.test(fields[i - 1].id || fields[i - 1].className);
  }));
  await slider(page).focus();
  await page.keyboard.press("ArrowRight");
  check("arrow right: 5 seconds", (await shown(page)) === "5 seconds", await shown(page));
  await page.keyboard.press("End");
  check("End: 10 seconds (the most)", (await shown(page)) === "10 seconds" && (await slider(page).inputValue()) === "10");
  await page.keyboard.press("ArrowRight");
  check("can't go past 10", (await slider(page).inputValue()) === "10");
  await page.keyboard.press("Home");
  check("Home: 2 seconds (the least)", (await shown(page)) === "2 seconds");
  check("screen readers hear the value", (await slider(page).getAttribute("aria-valuetext")) === "2 seconds");
  await field.screenshot({ path: `${shots}/1-slider.png` });

  section("Live Preview follows it");
  const iframeSel = "iframe.live-preview-iframe, .live-preview-window iframe";
  if (!(await page.locator(iframeSel).count())) await page.locator(".live-preview-toggler").click().catch(() => {});
  const hasPreview = await page.locator(iframeSel).first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  check("Live Preview opens", hasPreview);
  if (hasPreview) {
    const frame = page.frameLocator(iframeSel).first();
    await frame.locator("#top .hero-indicator-fill--animated").waitFor({ timeout: 60000 });
    // The mouse over the editor, not the preview: hovering the hero pauses it.
    await page.mouse.move(5, 5);
    await setSeconds(page, 4.5);
    await page.waitForTimeout(1500);
    let s = await heroState(frame);
    check("preview at 4.5: the bar fills over 4500ms", s.fillMs === "4500ms", s);
    check("crossfade stays 1200ms", ["1200ms", "1.2s"].includes(s.fade) && /hero-fade-duration/.test(s.fadeUsed ?? ""), s);
    await setSeconds(page, 2);
    await page.waitForTimeout(800);
    s = await heroState(frame);
    check("preview at 2: the bar fills over 2000ms, straight away", s.fillMs === "2000ms", s);
    // Slides change every ~2s now: watch it move on twice within 5s.
    const seen = new Set([s.active]);
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);
      seen.add((await heroState(frame)).active);
    }
    check("preview moves on every ~2s (3+ slides seen in 5s)", seen.size >= 3, [...seen]);
    check("crossfade still 1200ms", ["1200ms", "1.2s"].includes((await heroState(frame)).fade));
    await setSeconds(page, 10);
    // Each key press goes through Payload's form state before Live Preview
    // gets it, so after 16 quick ones the preview can lag a moment.
    const t0 = Date.now();
    await frame.locator("#top .hero-indicator-fill--animated[style*='10000ms']").waitFor({ timeout: 5000 }).catch(() => {});
    s = await heroState(frame);
    r.lines.push(`(preview caught up with 16 quick changes in ${Date.now() - t0}ms)`);
    check("preview at 10: the bar fills over 10000ms", s.fillMs === "10000ms", s);
    const at = s.active;
    await page.waitForTimeout(4000);
    check("and holds a slide for longer than 4.5s", (await heroState(frame)).active === at);
  }
  await page.screenshot({ path: `${shots}/2-editor-preview.png` });

  section("Publish sends it (faked)");
  await setSeconds(page, 7);
  // The full body (the guard's log keeps only the start); still faked by the guard.
  const bodies = [];
  await page.route(/\/hv-studio\/api\/globals\/hero(\?|$)/, (route) => {
    if (route.request().method() === "POST") bodies.push(route.request().postData() ?? "");
    return route.fallback();
  });
  await page.locator("#action-save, button:has-text('Publish')").first().click();
  await page.waitForTimeout(2500);
  const body = bodies.join("\n");
  check("the save was faked", guard.writes().some((w) => /globals\/hero/.test(w.url)));
  check("the save carries secondsPerPhoto 7", /"secondsPerPhoto":7[,}]/.test(body), body.match(/"secondsPerPhoto":[^,}]*/)?.[0] ?? body.slice(0, 200));
  await page.close();
  await ctx.close();

  section("homepage, saved value");
  {
    const site = await newContext(browser, { viewport: { width: 1440, height: 900 } });
    page = await site.ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/`, { timeout: 120000 });
    await page.locator("#top .hero-indicator-fill--animated").waitFor({ timeout: 60000 });
    const s = await heroState(page);
    check("the bar fills over the saved 4.5s", s.fillMs === `${saved.secondsPerPhoto * 1000}ms`, s);
    check("pause button offered", s.pause);
    await site.ctx.close();
  }

  section("reduced motion");
  {
    const rm = await newContext(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    page = await rm.ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/`, { timeout: 120000 });
    await page.locator("#top .hero-indicators").waitFor({ timeout: 60000 });
    await page.mouse.move(5, 890);
    const first = await heroState(page);
    check("no animated bar, no pause button", first.fillMs === null && !first.pause, first);
    await page.waitForTimeout(6000);
    check("doesn't move on by itself after 6s", (await heroState(page)).active === first.active, first.active);
    await rm.ctx.close();
  }

  section("phone, 390x844");
  {
    const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    page = await phone.ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${ADMIN}/globals/hero`, { timeout: 120000 });
    await slider(page).waitFor({ timeout: 60000 });
    await page.waitForTimeout(1500);
    await slider(page).scrollIntoViewIfNeeded();
    const fits = await page.locator(".hero-seconds").evaluate((el) => {
      const row = el.querySelector(".hero-seconds__row").getBoundingClientRect();
      const out = el.querySelector(".hero-seconds__value").getBoundingClientRect();
      const bar = el.querySelector(".hero-seconds__slider").getBoundingClientRect();
      const ends = [...el.querySelectorAll(".hero-seconds__scale span")].map((e) => e.getBoundingClientRect());
      return { right: row.right <= document.documentElement.clientWidth, endsUnderSlider: Math.abs(ends[0].left - bar.left) < 2 && Math.abs(ends[1].right - bar.right) < 2, sameLine: Math.abs(out.top + out.height / 2 - (bar.top + bar.height / 2)) < 8, barWidth: Math.round(bar.width), tall: bar.height >= 44 };
    });
    check("slider and value fit on one line, 2s/10s under the slider's ends, easy to tap", fits.right && fits.endsUnderSlider && fits.sameLine && fits.barWidth >= 150 && fits.tall, fits);
    await page.locator(".hero-seconds").screenshot({ path: `${shots}/3-phone.png` });
    await checkNoSidewaysScroll(page, r, "no sideways scroll");
    check("nothing was saved on the phone", phone.guard.writes().length === 0, phone.guard.lines());
    await phone.ctx.close();
  }

  check("no page errors", errors.length === 0, errors.slice(0, 3));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
