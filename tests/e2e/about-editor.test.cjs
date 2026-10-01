// The About editor: the Bio allows paragraphs, bold, italic and links only;
// the Quick links rows have column labels (Title, Subtitle, Links to); a
// quick link to a page with nothing published (Backstage, Testimonials) is
// hidden on the homepage, and the editor says so on that link.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Nothing is saved: the bio is typed into and then left. Whether each page
// has content is read from the database through the API, so the test holds
// either way; publishing something to see a link come back is a manual check.
// Run with `npm run test:e2e about-editor` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, BASE, ADMIN, API } = require("./lib/harness.cjs");

const r = report("about-editor");
const { check, section } = r;
const shots = outDir("about-editor");

// Same rule as src/lib/listing-pages.ts.
const LISTING = {
  "/backstage": { name: "Backstage", query: "backstage/count?where[published][equals]=true" },
  "/testimonials": {
    name: "Testimonials",
    query: "testimonials/count?where[and][0][published][equals]=true&where[and][1][category][exists]=true",
  },
};

async function openAbout(page) {
  await page.goto(`${ADMIN}/globals/about`, { timeout: 120000 });
  await page.locator(".nav-links--quick .nav-links__row").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);
}

// Each row's labels: text, and whether they're actually visible.
const rowLabels = (page) =>
  page.locator(".nav-links--quick .nav-links__row").evaluateAll((rows) =>
    rows.map((row) =>
      [...row.querySelectorAll(".nav-links__fields .field-label")].map((label) => {
        const box = label.getBoundingClientRect();
        const input = label.closest(".field-type")?.querySelector("input, .react-select");
        return {
          text: label.textContent.trim(),
          visible: box.width > 2 && box.height > 2,
          above: input ? box.bottom <= input.getBoundingClientRect().top + 1 : false,
          // Screen readers: the label still names its input.
          forInput: !!(label.htmlFor && document.getElementById(label.htmlFor)),
        };
      }),
    ),
  );

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const errors = [];
  const empty = {};
  {
    const page = await ctx.newPage();
    await page.goto(`${ADMIN}/globals/about`, { timeout: 120000 });
    for (const [href, { query }] of Object.entries(LISTING)) {
      const res = await page.request.get(`${API}/${query}`);
      empty[href] = (await res.json()).totalDocs === 0;
    }
    await page.close();
  }
  r.lines.push(`(Backstage ${empty["/backstage"] ? "empty" : "has content"}, Testimonials ${empty["/testimonials"] ? "empty" : "has content"})`);

  // 1. Column labels, wide: headings over the first row only.
  section("quick links, 1400x950");
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await openAbout(page);
  let rows = await rowLabels(page);
  check("labels on every input: Title, Subtitle, Links to", rows.length > 0 && rows.every((row) => row.map((l) => l.text).join("|") === "Title|Subtitle|Links to"), rows);
  check("shown over the first row", rows[0]?.every((l) => l.visible && l.above), rows[0]);
  check("not repeated over the other rows", rows.slice(1).every((row) => row.every((l) => !l.visible)), rows.slice(1));
  check("each label belongs to its input", rows.flat().every((l) => l.forInput));

  // 2. The note on a link to an empty page.
  const notes = await page.locator(".nav-links--quick .nav-links__row").evaluateAll((els) =>
    els.map((row) => ({ title: row.querySelector("input")?.value, notes: [...row.querySelectorAll(".nav-links__note")].map((n) => n.textContent) })),
  );
  for (const [href, { name }] of Object.entries(LISTING)) {
    const row = notes.find((n) => n.title === name);
    if (!row) { r.lines.push(`(no ${name} link in the editor, note not checked)`); continue; }
    const want = `${name} has nothing published yet, so this link is hidden on your site until that page has content.`;
    check(`${name} link: ${empty[href] ? "says it's hidden" : "no note (page has content)"}`, empty[href] ? row.notes.includes(want) : row.notes.length === 0, row.notes);
  }
  await page.locator(".nav-links--quick").screenshot({ path: `${shots}/quick-links-wide.png` });

  // 3. The bio: paragraphs, bold, italic and links only.
  section("bio editor");
  const bio = page.locator(".rich-text-lexical [contenteditable='true']").first();
  await bio.scrollIntoViewIfNeeded();
  check("no fixed toolbar", (await page.locator(".rich-text-lexical .fixed-toolbar").count()) === 0);
  await bio.click();
  await page.keyboard.type("/");
  const slash = page.locator(".slash-menu-popup");
  await slash.waitFor({ timeout: 10000 }).catch(() => {});
  const slashItems = (await slash.innerText().catch(() => "")).split("\n").map((s) => s.trim()).filter(Boolean);
  check("no slash menu (no blocks to insert)", slashItems.length === 0, slashItems);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Backspace");
  // Markdown shortcuts that would make removed blocks.
  for (const line of ["# Heading", "## Sub", "- item", "1. item", "> quote"]) {
    await page.keyboard.type(line);
    await page.keyboard.press("Enter");
  }
  const blocks = await bio.evaluate((el) => [...el.children].map((c) => c.tagName.toLowerCase()));
  check("markdown shortcuts stay paragraphs (no headings, lists, quotes)", blocks.every((t) => t === "p"), blocks);
  // Select a word: the inline toolbar.
  await page.keyboard.type("hello");
  await page.keyboard.press("Shift+Home");
  const toolbar = page.locator(".inline-toolbar-popup");
  await toolbar.waitFor({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  const tools = await toolbar.locator("button").evaluateAll((buttons) =>
    buttons.map((b) => (String(b.className).match(/toolbar-popup__button-([\w-]+)/) || [])[1] || b.getAttribute("aria-label") || b.textContent.trim()),
  ).catch(() => []);
  check("selection toolbar: bold, italic, link only", [...tools].sort().join(",") === "bold,italic,link", tools);
  await page.screenshot({ path: `${shots}/bio-toolbar.png` });
  // Bold, italic and a link still work.
  await page.keyboard.press("Control+b");
  await page.keyboard.press("Control+i");
  // Lexical writes bold + italic as one element with both theme classes.
  const marks = await bio.evaluate((el) => el.lastElementChild?.innerHTML || "");
  check("bold and italic apply", /textBold/.test(marks) && /textItalic/.test(marks), marks.slice(0, 200));
  await toolbar.locator("button[class*='toolbar-popup__button-link']").click().catch(() => {});
  const linkDrawer = page.locator(".drawer__content").last();
  const drawerOpen = await linkDrawer.waitFor({ timeout: 10000 }).then(() => true, () => false);
  const drawerText = drawerOpen ? await linkDrawer.innerText() : "";
  check("link drawer opens", drawerOpen);
  check("links are to web addresses only (no 'Internal link')", drawerOpen && !/Internal link/i.test(drawerText), drawerText.replace(/\s+/g, " ").slice(0, 200));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  // Leave without saving (close skips the unsaved-changes prompt).
  await page.close();

  // 4. Column labels, phone: rows wrap, so every row is labelled.
  section("quick links, 390x844 phone");
  const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  page = await phone.ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await openAbout(page);
  rows = await rowLabels(page);
  check("every row shows its labels", rows.length > 0 && rows.every((row) => row.length === 3 && row.every((l) => l.visible && l.above)), rows);
  await page.locator(".nav-links--quick").scrollIntoViewIfNeeded();
  await page.locator(".nav-links--quick").screenshot({ path: `${shots}/quick-links-phone.png` });
  await checkNoSidewaysScroll(page, r, "no sideways scroll");
  await page.close();

  // 5. The homepage: a card to an empty page is hidden, otherwise shown.
  section("homepage");
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/`, { timeout: 120000 });
  await page.locator("#about").waitFor({ timeout: 60000 });
  const about = await page.request.get(`${API}/globals/about?depth=0`).then((res) => res.json());
  const linked = new Set((about.quickLinks || []).filter((l) => l.href && l.title?.trim()).map((l) => l.href));
  const cards = await page.locator("#about a.link-chip").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  for (const [href, { name }] of Object.entries(LISTING)) {
    if (!linked.has(href)) continue;
    check(`${name} card ${empty[href] ? "hidden (page empty)" : "shown (page has content)"}`, cards.includes(href) === !empty[href], cards);
  }
  const others = [...linked].filter((href) => !LISTING[href]);
  check("other cards unaffected", others.every((href) => cards.includes(href)), { others, cards });
  await page.locator("#about").screenshot({ path: `${shots}/homepage-about.png` });
  await page.close();

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = [...guard.log, ...phone.guard.log].filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
