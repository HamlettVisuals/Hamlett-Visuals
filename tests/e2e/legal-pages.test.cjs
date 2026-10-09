// Privacy Policy and Terms (globals/LegalPages.ts, lib/legal-pages.ts):
//   (a) signed out, a page with no text 404s and its footer link is hidden
//       (and a page with text shows, with its link), checked against what's
//       saved today;
//   (b) in the editor, text typed into the body (a heading, a paragraph, a
//       list) and a "Last updated" date show in Live Preview with the
//       site's styles, and Publish sends them. The Publish is faked by the
//       guard, so nothing is saved.
// Also: both editors sit under Editor > Legal in the sidebar, and the
// Privacy Policy ends with the Site Settings email and phone once it has
// text (Terms doesn't).
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e legal-pages` (see README.md).
const { launchBrowser, newContext, report, outDir, BASE, ADMIN, API } = require("./lib/harness.cjs");
const { createGuard } = require("./lib/guard.cjs");

const r = report("legal-pages");
const { check, section } = r;
const shots = outDir("legal-pages");

const PAGES = [
  { slug: "privacy-policy", href: "/privacy-policy", label: "Privacy Policy" },
  { slug: "terms", href: "/terms", label: "Terms & Conditions" },
];

const hasText = (node) =>
  !!node && ((typeof node.text === "string" && node.text.trim() !== "") || (node.children || []).some(hasText));

(async () => {
  const browser = await launchBrowser();
  const errors = [];

  // What's saved today.
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const written = {};
  for (const p of PAGES) {
    const doc = await (await page.request.get(`${API}/globals/${p.slug}?depth=0`)).json();
    written[p.href] = hasText(doc.body?.root);
  }
  r.lines.push(`(saved: ${PAGES.map((p) => `${p.label} ${written[p.href] ? "has text" : "empty"}`).join(", ")})`);
  await page.close();

  section("(a) signed out: empty pages 404 and lose their footer link");
  const visitor = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await createGuard(BASE).install(visitor);
  page = await visitor.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  for (const p of PAGES) {
    const res = await page.goto(`${BASE}${p.href}`, { timeout: 120000 });
    const status = res?.status();
    if (written[p.href]) {
      check(`${p.href}: shows (has text)`, status === 200, status);
    } else {
      check(`${p.href}: 404 (no text)`, status === 404, status);
    }
  }
  await page.goto(`${BASE}/`, { timeout: 120000 });
  const legal = await page.locator("#footer a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  for (const p of PAGES) {
    check(`footer ${written[p.href] ? "links" : "has no link"} to ${p.href}`, legal.includes(p.href) === written[p.href], legal);
  }
  const legalNav = await page.locator("nav[aria-label='Legal']").count();
  check("no empty Legal row when both are hidden", Object.values(written).some(Boolean) || legalNav === 0, legalNav);
  await page.locator("#footer").screenshot({ path: `${shots}/1-footer.png` });
  await visitor.close();

  section("sidebar: Editor > Legal");
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ADMIN}/globals/terms`, { timeout: 120000 });
  await page.locator(".rich-text-lexical [contenteditable='true']").first().waitFor({ timeout: 60000 });
  const nav = await page.locator(".site-nav__label").allInnerTexts();
  check("sidebar lists Legal, Privacy Policy, Terms & Conditions", ["Legal", "Privacy Policy", "Terms & Conditions"].every((l) => nav.includes(l)), nav);
  const order = ["Booking Page", "Legal", "Site Settings"].map((l) => nav.indexOf(l));
  check("Legal sits after the pages and before Site Settings", order.every((i, n) => i >= 0 && (n === 0 || i > order[n - 1])), order);
  check("no 'Not yet editable' left", !(await page.locator(".site-nav__note").allInnerTexts()).some((t) => /Not yet editable/.test(t)));
  const title = await page.title();
  check("page title says Terms & Conditions", /Terms & Conditions/.test(title), title);
  check("date field in the sidebar", (await page.locator(".document-fields__sidebar #field-lastUpdated, .document-fields__sidebar .field-type.date-time-field").count()) > 0);
  check("API tab hidden", (await page.locator("a[href$='/globals/terms/api']").count()) === 0);

  section("(b) typed text and date show in Live Preview, and Publish sends them");
  if (!(await page.locator(".live-preview-window iframe").count())) await page.locator(".live-preview-toggler").click().catch(() => {});
  const frame = page.frameLocator(".live-preview-window iframe").first();
  await frame.locator("h1").waitFor({ timeout: 60000 });

  const body = page.locator(".rich-text-lexical [contenteditable='true']").first();
  await body.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  for (const line of ["## Bookings", "A deposit holds your date.", "- One reschedule is free"]) {
    await page.keyboard.type(line);
    await page.keyboard.press("Enter");
  }
  const blocks = await body.evaluate((el) => [...el.children].map((c) => c.tagName.toLowerCase()));
  check("editor makes an H2, a paragraph and a list", ["h2", "p", "ul"].every((t) => blocks.includes(t)), blocks);

  // Her own date, typed into the sidebar's picker.
  const date = page.locator("#field-lastUpdated input, .date-time-field input").first();
  await date.click();
  await date.fill("September 1, 2026");
  await date.press("Enter");
  await page.keyboard.press("Escape");

  const h2 = frame.locator("h2", { hasText: "Bookings" });
  const shown = await h2.waitFor({ timeout: 20000 }).then(() => true, () => false);
  check("preview shows the heading", shown);
  const styles = await frame.locator("main").evaluate((main) => {
    const pick = (sel) => main.querySelector(sel)?.className ?? null;
    return { h2: pick("h2"), p: [...main.querySelectorAll("p")].find((p) => /deposit/.test(p.textContent))?.className ?? null, ul: pick("ul") };
  });
  check("H2 in the section-heading style", /font-display/.test(styles.h2) && /text-heading/.test(styles.h2) && /text-ink/.test(styles.h2), styles.h2);
  check("paragraph in the body style", /text-body/.test(styles.p) && /text-muted/.test(styles.p), styles.p);
  check("list as a bulleted body list", /list-disc/.test(styles.ul) && /text-body/.test(styles.ul), styles.ul);
  // The date reaches the preview on its own message, after the text.
  await frame.locator("header p", { hasText: "Last updated" }).waitFor({ timeout: 20000 }).catch(() => {});
  const updated = await frame.locator("header p").allInnerTexts().catch(() => []);
  check("'Last updated September 1, 2026' under the title", updated.includes("Last updated September 1, 2026"), updated);
  await page.screenshot({ path: `${shots}/2-live-preview.png` });

  await page.locator("#action-save").click();
  await page.waitForTimeout(2500);
  const sent = guard.writes().find((w) => /\/globals\/terms/.test(w.url));
  check("Publish sends the global (faked)", !!sent, guard.lines().slice(-5));
  check("…with the text", /Bookings/.test(sent?.body ?? "") || /Bookings/.test(JSON.stringify(sent ?? {})), (sent?.body ?? "").slice(0, 200));

  check("Terms has no contact block", (await frame.getByText("Questions about this policy?").count()) === 0);
  await page.close();

  section("Privacy Policy: contact lines under the text, from Site Settings");
  const settings = await (await ctx.request.get(`${API}/globals/site-settings?depth=0`)).json();
  const footerDoc = await (await ctx.request.get(`${API}/globals/final-cta-footer?depth=0`)).json();
  const email = settings.contact?.email?.trim() || null;
  const phoneOn = footerDoc.showPhone !== false && !!settings.contact?.phone?.trim();
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ADMIN}/globals/privacy-policy`, { timeout: 120000 });
  const ppBody = page.locator(".rich-text-lexical [contenteditable='true']").first();
  await ppBody.waitFor({ timeout: 60000 });
  const desc = await page.locator(".field-type.rich-text-lexical .field-description, .field-type.richText .field-description").first().innerText().catch(() => "");
  check("body description mentions the contact lines", desc.includes("Your contact email and phone from Site Settings are shown automatically at the bottom."), desc);
  if (!(await page.locator(".live-preview-window iframe").count())) await page.locator(".live-preview-toggler").click().catch(() => {});
  const ppFrame = page.frameLocator(".live-preview-window iframe").first();
  await ppFrame.locator("h1").waitFor({ timeout: 60000 });
  const wasEmpty = !written["/privacy-policy"];
  if (wasEmpty) check("no contact block while the text is empty", (await ppFrame.getByText("Questions about this policy?").count()) === 0);
  await ppBody.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("We only keep what you send us.");
  const question = ppFrame.getByText("Questions about this policy?");
  const hasQuestion = await question.waitFor({ timeout: 20000 }).then(() => true, () => false);
  check(`contact block ${email || phoneOn ? "shown" : "left out (nothing in Site Settings)"}`, hasQuestion === Boolean(email || phoneOn));
  const contactLinks = await ppFrame.locator("main section a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  if (email) check("email as a mailto link", contactLinks.includes(`mailto:${email}`), contactLinks);
  check(phoneOn ? "phone as a tel: link" : "no phone (blank or switched off)", contactLinks.some((h) => h?.startsWith("tel:")) === phoneOn, contactLinks);
  const after = await ppFrame.locator("main").evaluate((main) => {
    const q = [...main.querySelectorAll("p")].find((p) => p.textContent === "Questions about this policy?");
    const text = [...main.querySelectorAll("p")].find((p) => /only keep/.test(p.textContent));
    return !!q && !!text && !!(text.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  check("block sits below the text", after);
  await page.screenshot({ path: `${shots}/3-privacy-contact.png` });

  check("no page errors", errors.length === 0, errors);
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
