// The Testimonials admin (collections/Testimonials.ts, components/admin/
// Testimonials, globals/TestimonialsPage.ts): the grouped list (redirect,
// tabs, sections, rows, the Published pill, Add to / Remove from homepage),
// a testimonial's edit page (fields and their order, Published and Show on
// homepage in the main column with Live Preview open or closed, the
// category locked to its album, the album's photos, the Context
// placeholder, the homepage limit) and Live Preview opening /testimonials
// on the card, plus Page settings (the Testimonials Section's own font is
// in testimonials-section.test.cjs).
//
// Uses the real data (one testimonial today, so dragging is covered by the
// shared reorder code's own tests, portfolio-reorder, and the server rules
// by tests/unit/testimonials-admin.test.mts). Every write is faked by the
// shared guard (lib/guard.cjs); nothing is saved.
// Run with `npm run test:e2e testimonials-admin` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN, API } = require("./lib/harness.cjs");

const r = report("testimonials-admin");
const { check, section } = r;
const shots = outDir("testimonials-admin");

(async () => {
  const browser = await launchBrowser();
  const errors = [];
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  // Console errors too (the dev overlay reports them with a request the
  // guard logs), with the section they happened in.
  let currentSection = "";
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) consoleErrors.push(`${currentSection}: ${m.text().slice(0, 300)}`);
  });
  const sectionAt = (title) => {
    currentSection = title;
    section(title);
  };

  const list = await (await page.request.get(`${API}/testimonials?depth=0&limit=100`)).json();
  const teaser = await (await page.request.get(`${API}/globals/testimonials-teaser?depth=0`)).json();
  const first = list.docs[0];
  r.lines.push(`(testimonials: ${list.docs.map((d) => `${d.id} ${d.clientName}`).join(", ")}; homepage picks: ${JSON.stringify(teaser.testimonials)})`);

  sectionAt("the list");
  await page.goto(`${ADMIN}/collections/testimonials`, { timeout: 120000 });
  await page.locator(".testimonials").waitFor({ timeout: 60000 });
  check("the collection's list opens the grouped list", new URL(page.url()).pathname === "/hv-studio/testimonials", page.url());
  const tabs = await page.locator(".testimonials__tabs a").allInnerTexts();
  check("tabs: All, Needs review, Page settings, Trash", tabs.map((t) => t.replace(/\s*\(\d+\)/, "")).join("|") === "All|Needs review|Page settings|Trash", tabs);
  check("All is the current tab", (await page.locator('.testimonials__tabs a[aria-current="page"]').innerText()) === "All");
  const sections = await page.locator(".portfolio__section .portfolio__name").allInnerTexts();
  check("one section per category", sections.length >= 1, sections);
  const row = page.locator(".testimonials__row").first();
  check("a row shows the name", (await row.locator(".portfolio__album-title").innerText()).trim() === first.clientName);
  check("and a bit of the quote", (await row.locator(".testimonials__snippet").innerText()).length > 5);
  check("and its album", (await row.locator(".testimonials__album").innerText()).trim().length > 0);
  check("and a photo", (await row.locator("img.portfolio__thumb").count()) === 1);
  const pill = (await row.locator(".category-status").innerText()).trim();
  check("the pill says Published or Hidden, not true/false", pill === (first.published ? "Published" : "Hidden"), pill);
  const onHome = (teaser.testimonials ?? []).map((t) => (typeof t === "object" ? t.id : t)).includes(first.id);
  check("On homepage matches the section's picks", (await row.locator(".testimonials__on-homepage").count()) === (onHome ? 1 : 0));
  await page.screenshot({ path: `${shots}/1-list.png`, fullPage: true });

  sectionAt("homepage from the list");
  // The action the row offers, and what it sends. The guard fakes the save,
  // so after the list reloads it shows the saved state again (asExpected).
  const actionName = onHome ? "Remove from homepage" : "Add to homepage";
  if (onHome || first.published) {
    const before = guard.writes().length;
    await row.getByRole("button", { name: actionName }).click();
    await page.waitForTimeout(300);
    const sent = guard.writes().slice(before).find((w) => w.url.includes(`/testimonials/${first.id}/homepage`));
    check(`${actionName} sends on:${!onHome}`, sent && new RegExp(`"on":${!onHome}`).test(sent.body ?? ""), sent);
    await page.waitForTimeout(2500);
    r.asExpected("after the faked save the list shows the saved state again", (await row.getByRole("button", { name: actionName }).count()) === 1);
  }
  // The server refusing shows its reason, and the row goes back.
  await page.route(`**/api/testimonials/${first.id}/homepage`, (route) =>
    route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "The homepage already shows 4 testimonials. Remove one from the homepage first." }) }),
  );
  if (onHome || first.published) {
    await row.getByRole("button", { name: actionName }).click();
    await page.waitForTimeout(800);
    const message = await page.locator(".portfolio__error").innerText().catch(() => "");
    check("a refusal says why", message.includes("already shows 4"), message);
    check("and the row goes back", (await row.getByRole("button", { name: actionName }).count()) === 1);
  }
  await page.unroute(`**/api/testimonials/${first.id}/homepage`);

  sectionAt("Needs review");
  await page.goto(`${ADMIN}/testimonials?view=review`, { timeout: 120000 });
  await page.locator(".testimonials").waitFor();
  check("Needs review is the current tab", (await page.locator('.testimonials__tabs a[aria-current="page"]').innerText()).startsWith("Needs review"));
  const reviewRows = await page.locator(".testimonials__row").count();
  const expected = list.docs.filter((d) => d.source === "client" && d.published === false).length;
  check("it lists only hidden client submissions", reviewRows === expected, { reviewRows, expected });

  sectionAt("Trash");
  await page.goto(`${ADMIN}/collections/testimonials/trash`, { timeout: 120000 });
  await page.locator(".testimonials__tabs").waitFor({ timeout: 60000 });
  check("Payload's Trash list has the tabs", (await page.locator('.testimonials__tabs a[aria-current="page"]').innerText()) === "Trash");

  sectionAt("the edit page");
  await page.goto(`${ADMIN}/collections/testimonials/${first.id}`, { timeout: 120000 });
  await page.locator("#field-quote").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  const source = await page.locator(".testimonial-source").innerText().catch(() => "");
  check("it says where it came from", first.source === "client" ? source.includes("Submitted by client") : source.trim() === "Added by you", source);
  const rows = await page.locator("#field-quote").getAttribute("rows");
  check("Quote is a few rows tall", Number(rows) >= 4, rows);
  const mainLabels = await page.evaluate(() => [...document.querySelectorAll(".document-fields__main label")].map((l) => l.textContent.trim()));
  const sidebarLabels = await page.evaluate(() => [...document.querySelectorAll(".document-fields__sidebar label")].map((l) => l.textContent.trim()));
  check("Published is in the main column", mainLabels.includes("Published") && !sidebarLabels.includes("Published"), { mainLabels, sidebarLabels });
  const tail = mainLabels.filter((l) => l).slice(-2);
  check("Published, then Show on homepage, are last", tail.join("|") === "Published|Show on homepage", mainLabels);

  if (first.event) {
    const category = page.locator(".testimonial-category");
    const desc = await category.locator(".field-description").innerText().catch(() => "");
    check("with an album, the category is set by it", /Set by the album/.test(desc), desc);
    check("and locked", (await category.locator(".rs__control--is-disabled, [aria-disabled='true'], .read-only").count()) > 0);
    const event = await (await page.request.get(`${API}/events/${typeof first.event === "object" ? first.event.id : first.event}?depth=1&trash=true`)).json();
    const mismatch = event.category?.id !== (typeof first.category === "object" ? first.category?.id : first.category);
    if (mismatch) {
      const warning = await category.locator(".field-warning").innerText().catch(() => "");
      check("a saved mismatch is pointed out, not changed", warning.includes(`This album is in ${event.category.name}`), warning);
    }
    const strip = await page.locator(".testimonial-photo__pick .testimonial-photo__option").count();
    check("the album's photos are offered", strip > 0, strip);
  }
  const placeholder = await page.locator("#field-context").getAttribute("placeholder");
  check("Context shows the automatic line as its placeholder", Boolean(placeholder) && placeholder.length > 2, placeholder);
  const photoHelp = await page.locator(".testimonial-photo .field-description").innerText().catch(() => "");
  check("the photo's help says the album's cover is used", /album's cover is used/.test(photoHelp), photoHelp);
  await page.screenshot({ path: `${shots}/2-edit.png`, fullPage: true });

  sectionAt("Show on homepage: the limit");
  await page.route("**/api/globals/testimonials-teaser?depth=0", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ testimonials: [9001, 9002, 9003, 9004] }) }),
  );
  await page.reload();
  await page.locator("#field-quote").waitFor();
  await page.waitForTimeout(1500);
  const homeSwitch = page.locator("#field-showOnHomepage");
  if (first.published && (await homeSwitch.getAttribute("aria-checked")) === "false") {
    await homeSwitch.click();
    const msg = await page.locator(".show-on-website .field-warning").innerText().catch(() => "");
    check("turning it on with 4 already says so", msg.includes("already shows 4"), msg);
    check("and leaves it off", (await homeSwitch.getAttribute("aria-checked")) === "false");
  }
  await page.unroute("**/api/globals/testimonials-teaser?depth=0");

  sectionAt("Live Preview");
  // A click before the page has finished starting up can be lost, so it
  // tries again until the preview pane is showing.
  const toggler = page.locator("#live-preview-toggler");
  const paneShown = () => page.locator(".live-preview-window").evaluate((e) => getComputedStyle(e).display !== "none").catch(() => false);
  for (let i = 0; i < 3 && !(await paneShown()); i++) {
    await toggler.click();
    await page.waitForTimeout(2500);
  }
  check("the preview pane opens", await paneShown());
  const src = await page.locator("#live-preview-iframe").getAttribute("src");
  check("it opens through the preview route for this testimonial", src?.includes(`/api/preview/testimonial?id=${first.id}`), src);
  // The preview page compiles on first use, so wait for its card.
  const frame = await (await page.$("#live-preview-iframe")).contentFrame();
  await frame.waitForSelector(`#testimonial-${first.id}`, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(2500);
  check("which lands on /testimonials with lpDoc", frame.url().includes(`/testimonials?lpDoc=${first.id}`), frame.url());
  const at = await frame.evaluate((id) => {
    const card = document.getElementById(`testimonial-${id}`)?.getBoundingClientRect().top ?? null;
    const header = document.getElementById("site-header")?.getBoundingClientRect().bottom ?? 0;
    const atBottom = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2;
    return { card: card === null ? null : Math.round(card), header: Math.round(header), scrollY: Math.round(scrollY), atBottom };
  }, first.id);
  // Just under the sticky header, or as near as the page can scroll.
  check(
    "scrolled to its card, clear of the sticky header",
    at.card !== null && at.card >= at.header - 1 && (at.card <= at.header + 60 || at.atBottom) && at.scrollY > 0,
    at,
  );
  const mainWithPreview = await page.evaluate(() => [...document.querySelectorAll(".document-fields__main label")].map((l) => l.textContent.trim()));
  check("with preview open, Published and Show on homepage stay last", mainWithPreview.filter(Boolean).slice(-2).join("|") === "Published|Show on homepage", mainWithPreview);
  await page.screenshot({ path: `${shots}/3-preview.png` });

  sectionAt("Page settings");
  await page.goto(`${ADMIN}/globals/testimonials-page`, { timeout: 120000 });
  await page.locator("#field-title").waitFor({ timeout: 60000 });
  check("Page settings is the current tab", (await page.locator('.testimonials__tabs a[aria-current="page"]').innerText()) === "Page settings");
  check("title is editable", (await page.locator("#field-title").inputValue()).length > 0);
  check("intro is editable", (await page.locator("#field-intro").count()) === 1);
  const reviewSwitch = await page.locator("#field-showReviewSection").getAttribute("aria-checked");
  check("the review section is off", reviewSwitch === "false", reviewSwitch);
  const font = await page.locator(".field-type.select").filter({ hasText: "Quote font" }).locator(".rs__single-value").innerText().catch(() => "");
  check("the page's font is Lora", font.trim() === "Lora", font);
  await page.locator(".field-type.select").filter({ hasText: "Quote font" }).locator(".rs__control").click();
  const options = await page.locator(".rs__option").allInnerTexts();
  check("the dropdown lists the registry's fonts", ["Lora", "Literata", "Fraunces Soft", "Merriweather Light", "Petrona", "Fraunces (upright)"].every((o) => options.includes(o)), options);
  await page.keyboard.press("Escape");

  sectionAt("phone");
  const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p2 = await phone.ctx.newPage();
  p2.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) consoleErrors.push(`phone: ${m.text().slice(0, 1500)}`);
  });
  await p2.goto(`${ADMIN}/testimonials`, { timeout: 120000 });
  await p2.locator(".testimonials").waitFor({ timeout: 60000 });
  await checkNoSidewaysScroll(p2, r, "list on a phone");
  const pillBox = await p2.locator(".testimonials__row .category-status").first().boundingBox();
  check("the pill stays on screen", pillBox && pillBox.x + pillBox.width <= 390, pillBox);
  await p2.screenshot({ path: `${shots}/4-phone.png`, fullPage: true });

  sectionAt("nothing saved");
  const unexpected = [...guard.writes(), ...phone.guard.writes()].filter((w) => !/\/testimonials\/\d+\/homepage/.test(w.url));
  check("no write left the browser except the faked homepage change", unexpected.length === 0, unexpected.map((w) => w.url));
  check("no page errors", errors.length === 0, errors);
  check("no console errors", consoleErrors.length === 0, consoleErrors);

  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
