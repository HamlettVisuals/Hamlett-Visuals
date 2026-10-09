// The Hook (Hero) editor's "Hero slides" (globals/Hero.ts): every row starts
// collapsed when the page opens, and each collapsed header tells the slides
// apart (HeroSlideRowLabel.tsx): the main image's thumbnail, "Slide 01" and
// the photo's name (alt text, else file name), "+ mobile image" when it has
// one. Checked against the saved slides and their photos; opening a row
// still shows its fields; a new slide reads "No image yet".
//
// Rows are collapsed unless the signed-in user's saved preference says
// otherwise: Payload remembers which rows were left open (payload-
// preferences, read on the server), so the start is checked against that,
// and any open rows are then collapsed in the page before the rest of the
// test. Every write is faked by the shared guard (lib/guard.cjs), including
// the collapsed/open preference Payload saves, so the saved preference is
// never changed (checked at the end).
// Run with `npm run test:e2e hero-slides-collapsed` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN, API } = require("./lib/harness.cjs");

const r = report("hero-slides-collapsed");
const { check, section } = r;
const shots = outDir("hero-slides-collapsed");

const ROWS = "#field-slides .array-field__row";

// Each row: collapsed?, its header's parts, and whether its fields are visible.
const rowState = (page) =>
  page.locator(ROWS).evaluateAll((rows) =>
    rows.map((row) => {
      const toggle = row.querySelector(".collapsible__toggle");
      const label = row.querySelector(".hero-slide-label");
      const thumb = label?.querySelector("img.hero-slide-label__thumb");
      const upload = row.querySelector(".array-field__fields, .collapsible__content");
      const box = upload?.getBoundingClientRect();
      return {
        collapsed: !!toggle?.classList.contains("collapsible__toggle--collapsed"),
        number: label?.querySelector(".hero-slide-label__number")?.textContent,
        name: label?.querySelector(".hero-slide-label__name")?.textContent,
        mobile: !!label?.querySelector(".hero-slide-label__mobile"),
        thumb: thumb ? { src: thumb.getAttribute("src"), loaded: thumb.complete && thumb.naturalWidth > 0 } : null,
        fieldsVisible: !!box && box.height > 20,
      };
    }),
  );

// The signed-in user's saved preference for the Hero editor, as Payload
// stores it, and which rows it keeps collapsed (null: none saved, so all).
async function savedPreference(page) {
  const res = await page.request.get(`${API}/payload-preferences?where[key][equals]=global-hero&depth=0&limit=1`);
  const doc = (await res.json()).docs?.[0] ?? null;
  return { raw: JSON.stringify(doc?.value ?? null), collapsed: doc?.value?.fields?.slides?.collapsed ?? null };
}

// Collapses any open row in the page (the preference write this makes is
// faked by the guard).
async function collapseAll(page) {
  for (let i = 0; i < (await page.locator(ROWS).count()); i++) {
    const toggle = page.locator(`${ROWS} .collapsible__toggle`).nth(i);
    if (!(await toggle.evaluate((el) => el.classList.contains("collapsible__toggle--collapsed")))) {
      await toggle.click();
      await page.waitForTimeout(400);
    }
  }
}

async function open(page) {
  await page.goto(`${ADMIN}/globals/hero`, { timeout: 120000 });
  await page.locator(ROWS).first().waitFor({ timeout: 60000 });
  await page.waitForFunction(() => ![...document.querySelectorAll(".hero-slide-label__name")].some((n) => n.textContent === "Loading…"), null, { timeout: 30000 });
  // Then every row's thumbnail finished loading (or failed), rather than a
  // fixed pause: the files come from storage and can take a second or two.
  // A thumbnail that fails still fails the "loaded" checks below.
  await page
    .waitForFunction(
      () => [...document.querySelectorAll("img.hero-slide-label__thumb")].every((img) => img.complete),
      null,
      { timeout: 30000 },
    )
    .catch(() => {});
}

// On a phone an open Live Preview fills the screen and the fields sit
// behind "Edit fields". The Hero opens with it by default, and Payload
// remembers whether this user last left it open, so the phone checks close
// it first rather than depend on whoever last used the studio (the
// preference this saves is faked by the guard).
async function closeLivePreview(page) {
  const open = page.locator(".live-preview-toggler--active");
  if (await open.count()) {
    await open.click();
    await page.locator(".live-preview-toggler:not(.live-preview-toggler--active)").waitFor({ timeout: 10000 });
    await page.locator(ROWS).first().waitFor({ timeout: 30000 });
  }
}

(async () => {
  const browser = await launchBrowser();
  const errors = [];
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));

  // What the headers should say, from the saved slides and their photos.
  const hero = await (await page.request.get(`${API}/globals/hero?depth=1`)).json();
  const expected = (hero.slides || []).map((slide, i) => ({
    number: `Slide ${String(i + 1).padStart(2, "0")}`,
    name: slide.photo ? slide.photo.alt?.trim() || slide.photo.filename : "No image yet",
    thumb: slide.photo ? slide.photo.sizes?.thumbnail?.url || slide.photo.url : null,
    mobile: !!slide.mobilePhoto,
  }));
  r.lines.push(`(saved: ${expected.length} slides: ${expected.map((e) => `${e.name}${e.mobile ? " +m" : ""}`).join(", ")})`);
  const pref = await savedPreference(page);
  const startCollapsed = (hero.slides || []).map((slide) => (pref.collapsed ? pref.collapsed.includes(slide.id) : true));
  r.lines.push(`(saved preference: ${pref.collapsed ? `${startCollapsed.filter((c) => !c).length} row(s) left open` : "none, so all collapsed"})`);

  section("on opening, 1440x950");
  await open(page);
  let rows = await rowState(page);
  check(`${expected.length} rows`, rows.length === expected.length && expected.length > 0, rows.length);
  check(
    pref.collapsed ? "rows start as the saved preference left them" : "every row starts collapsed",
    rows.every((row, i) => row.collapsed === startCollapsed[i] && row.fieldsVisible === !startCollapsed[i]),
    rows.map((row) => [row.collapsed, row.fieldsVisible]),
  );
  await collapseAll(page);
  rows = await rowState(page);
  check("all rows collapsed for the rest of the test", rows.every((row) => row.collapsed && !row.fieldsVisible), rows.map((row) => row.collapsed));
  rows.forEach((row, i) => {
    const want = expected[i];
    if (!want) return;
    check(`row ${i + 1}: "${want.number} · ${want.name}"${want.mobile ? " + mobile image" : ""}`, row.number === want.number && row.name === want.name && row.mobile === want.mobile, row);
    check(`row ${i + 1}: its photo's thumbnail, loaded`, !!row.thumb && row.thumb.loaded && (!want.thumb || row.thumb.src === want.thumb), row.thumb);
  });
  const names = rows.map((row) => row.name);
  r.lines.push(`(headers tell slides apart: ${new Set(names).size} different names for ${names.length} rows)`);
  check("no 'Slide 01'-only headers", rows.every((row) => row.name && row.name !== "Loading…"));
  await page.locator("#field-slides").screenshot({ path: `${shots}/1-collapsed.png` });

  section("opening and closing a row");
  await page.locator(`${ROWS} .collapsible__toggle`).first().click();
  await page.waitForTimeout(600);
  rows = await rowState(page);
  check("first row opens and shows its fields", !rows[0].collapsed && rows[0].fieldsVisible, rows[0]);
  check("the others stay collapsed", rows.slice(1).every((row) => row.collapsed), rows.slice(1).map((row) => row.collapsed));
  check("header still shows the photo when open", rows[0].name === expected[0].name && !!rows[0].thumb, rows[0]);
  await page.locator(`${ROWS} .collapsible__toggle`).first().click();
  await page.waitForTimeout(600);
  check("and closes again", (await rowState(page))[0].collapsed);
  const writes = guard.writes(/\/access\//);
  check("only Payload's open/closed preference was sent (faked)", writes.every((w) => /payload-preferences/.test(w.url)), writes.map((w) => w.url));

  section("a new slide");
  const addButton = page.locator("#field-slides button.array-field__add-row, #field-slides button:has-text('Add Slide')").first();
  if ((await addButton.count()) && (await addButton.isEnabled())) {
    await addButton.click();
    // Payload renders a new row's label with the server's form state.
    await page.waitForFunction((sel) => {
      const rows = document.querySelectorAll(sel);
      return rows[rows.length - 1]?.querySelector(".hero-slide-label__name");
    }, ROWS, { timeout: 15000 }).catch(() => {});
    rows = await rowState(page);
    const last = rows[rows.length - 1];
    check(`the new row reads "Slide ${String(rows.length).padStart(2, "0")} · No image yet"`, last.number === `Slide ${String(rows.length).padStart(2, "0")}` && last.name === "No image yet" && !last.thumb, last);
  } else {
    r.lines.push("(slides are at the maximum; new slide not checked)");
  }
  // Leave without saving (close skips the unsaved-changes prompt).
  await page.close();

  section("phone, 390x844");
  const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  page = await phone.ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await closeLivePreview(page);
  rows = await rowState(page);
  check(
    "on the phone too: rows start as saved, with names",
    rows.length === expected.length && rows.every((row, i) => row.collapsed === startCollapsed[i] && row.name === expected[i].name),
    rows,
  );
  await collapseAll(page);
  const fit = await page.locator(ROWS).evaluateAll((els) => els.every((row) => {
    const label = row.querySelector(".hero-slide-label").getBoundingClientRect();
    const header = row.querySelector(".array-field__row-header, .collapsible__toggle-wrap").getBoundingClientRect();
    return label.right <= header.right + 1 && header.right <= document.documentElement.clientWidth;
  }));
  check("headers fit the screen", fit);
  await page.locator("#field-slides").scrollIntoViewIfNeeded();
  await page.locator("#field-slides").screenshot({ path: `${shots}/2-phone.png` });
  await checkNoSidewaysScroll(page, r, "no sideways scroll");
  await page.close();

  check("no page errors", errors.length === 0, errors.slice(0, 3));
  const prefAfter = await savedPreference(phone.ctx.pages()[0] ?? (await phone.ctx.newPage()));
  check("your saved preference is unchanged", prefAfter.raw === pref.raw, { before: pref.raw.slice(0, 200), after: prefAfter.raw.slice(0, 200) });
  const stray = [...guard.log, ...phone.guard.log].filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
