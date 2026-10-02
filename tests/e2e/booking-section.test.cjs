// The Booking Section editor (globals/BookingCta.ts): its name in the page
// title, breadcrumb, sidebar and Editor overview ("Booking Section", and
// "Booking Page" for the booking page), and the note under the contact
// switches when all three are off but the contact line text isn't empty.
//
// Every write is faked by the shared guard (lib/guard.cjs); nothing is saved.
// Run with `npm run test:e2e booking-section` (see README.md).
const { launchBrowser, newContext, report, outDir, ADMIN, API } = require("./lib/harness.cjs");

const r = report("booking-section");
const { check, section } = r;
const shots = outDir("booking-section");
const NOTE = "No contact details are shown, so this text will appear on its own.";
const SWITCHES = ["showEmail", "showPhone", "showInstagram"];

const noteText = (page) => page.locator(".contact-line-alone-note").allInnerTexts();

async function setSwitch(page, name, on) {
  const sw = page.locator(`#field-${name}`);
  if ((await sw.getAttribute("aria-checked")) !== String(on)) await sw.click();
  await page.waitForTimeout(200);
}

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  const errors = [];
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));

  const saved = await (await page.request.get(`${API}/globals/booking-cta?depth=0`)).json();
  r.lines.push(`(saved: text "${saved.contactLeadIn}", email ${saved.showEmail}, phone ${saved.showPhone}, instagram ${saved.showInstagram})`);

  section("names");
  await page.goto(`${ADMIN}/globals/booking-cta`, { timeout: 120000 });
  await page.locator("#field-showInstagram").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  const title = await page.title();
  check("page title says Booking Section", title.includes("Booking Section") && !title.includes("CTA"), title);
  const heading = (await page.locator(".doc-header__title, h1").first().innerText()).trim();
  check("heading says Booking Section", heading === "Booking Section", heading);
  const crumbs = (await page.locator(".step-nav").innerText()).replace(/\s+/g, " ");
  check("breadcrumb says Booking Section", crumbs.includes("Booking Section") && !crumbs.includes("CTA"), crumbs);
  const nav = await page.locator(".site-nav__label").allInnerTexts();
  check("sidebar: Booking Section and Booking Page", nav.includes("Booking Section") && nav.includes("Booking Page"), nav);
  check("sidebar: no old names", !nav.some((l) => l === "Booking" || l.includes("(page)") || l.includes("CTA")), nav);

  section("note under the switches");
  const original = await page.locator("#field-contactLeadIn").inputValue();
  if (!original.trim()) await page.locator("#field-contactLeadIn").fill("Prefer to reach out directly?");
  for (const s of SWITCHES) await setSwitch(page, s, true);
  check("no note with switches on", (await noteText(page)).length === 0);
  await setSwitch(page, "showEmail", false);
  await setSwitch(page, "showPhone", false);
  check("no note with one switch still on", (await noteText(page)).length === 0);
  await setSwitch(page, "showInstagram", false);
  const shown = await noteText(page);
  check("note shown with all off and text", shown.length === 1 && shown[0].trim() === NOTE, shown);
  check("note sits under the switches", await page.evaluate(() => {
    const note = document.querySelector(".contact-line-alone-note");
    const last = document.querySelector("#field-showInstagram")?.closest(".contact-switch");
    return !!note && !!last && !!(last.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));
  await page.locator(".contact-line-alone-note").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/1-note.png` });
  await page.locator("#field-contactLeadIn").fill("   ");
  await page.waitForTimeout(300);
  check("no note when the text is only spaces", (await noteText(page)).length === 0);
  await page.locator("#field-contactLeadIn").fill("");
  await page.waitForTimeout(300);
  check("no note when the text is empty", (await noteText(page)).length === 0);
  await page.locator("#field-contactLeadIn").fill("Say hi");
  await page.waitForTimeout(300);
  check("note back with text", (await noteText(page)).length === 1);
  await setSwitch(page, "showPhone", true);
  check("note gone when a switch is turned back on", (await noteText(page)).length === 0);
  check("nothing was saved (no writes sent)", guard.writes().length === 0, guard.lines());

  section("Editor overview");
  await page.goto(`${ADMIN}/editor`, { timeout: 120000 });
  await page.locator(".editor-overview").first().waitFor({ timeout: 60000 });
  const tiles = (await page.locator(".editor-overview").innerText()).split("\n").map((t) => t.trim());
  check("overview: Booking Section and Booking Page", tiles.includes("Booking Section") && tiles.includes("Booking Page"), tiles);
  check("overview: no old names", !tiles.some((t) => t === "Booking" || t === "Booking (page)"), tiles);

  check("no page errors", errors.length === 0, errors);
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
