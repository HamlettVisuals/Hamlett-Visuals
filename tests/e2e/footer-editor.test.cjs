// The Footer editor (globals/FinalCtaFooter.ts): its name in the page title,
// breadcrumb, sidebar and Editor overview; the footer links' column labels
// (Label, Links to: headings over the first row on a wide screen, on every
// row on a phone); and the empty-page rule shared with About's quick links:
// a link to Backstage or Testimonials while that page has nothing published
// gets a note in the editor (both states, from mocked counts) and is left
// out of the footer on the site (checked against the real counts, on the
// homepage and another page).
//
// Every write is faked by the shared guard (lib/guard.cjs); nothing is saved.
// Run with `npm run test:e2e footer-editor` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, BASE, ADMIN, API } = require("./lib/harness.cjs");

const r = report("footer-editor");
const { check, section } = r;
const shots = outDir("footer-editor");

// The same counts the site uses (lib/listing-pages.ts).
const LISTING = {
  "/backstage": { name: "Backstage", query: "backstage/count?where[published][equals]=true" },
  "/testimonials": {
    name: "Testimonials",
    query: "testimonials/count?where[and][0][published][equals]=true&where[and][1][category][exists]=true",
  },
};
const noteFor = (name) => `${name} has nothing published yet, so this link is hidden on your site until that page has content.`;

const ROWS = ".nav-links__row";

async function openFooter(page) {
  await page.goto(`${ADMIN}/globals/final-cta-footer`, { timeout: 120000 });
  await page.locator(ROWS).first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);
}

// Each row's labels: text, and whether they're actually visible above their input.
const rowLabels = (page) =>
  page.locator(ROWS).evaluateAll((rows) =>
    rows.map((row) =>
      [...row.querySelectorAll(".nav-links__fields .field-label")].map((label) => {
        const box = label.getBoundingClientRect();
        const input = label.closest(".field-type")?.querySelector("input, .react-select");
        return {
          text: label.textContent.trim(),
          visible: box.width > 2 && box.height > 2,
          above: input ? box.bottom <= input.getBoundingClientRect().top + 1 : false,
          forInput: !!(label.htmlFor && document.getElementById(label.htmlFor)),
        };
      }),
    ),
  );

// Each row's label text, destination and notes.
const rowNotes = (page) =>
  page.locator(ROWS).evaluateAll((rows) =>
    rows.map((row) => ({
      label: row.querySelector("input")?.value,
      to: row.querySelector(".nav-links__href .react-select")?.innerText.trim(),
      notes: [...row.querySelectorAll(".nav-links__note")].map((n) => n.textContent.trim()),
    })),
  );

// Answers the editor's two count requests with the given totals.
async function mockCounts(page, totals) {
  await page.route(/\/hv-studio\/api\/(backstage|testimonials)\/count\?/, (route) => {
    const collection = route.request().url().includes("/backstage/") ? "/backstage" : "/testimonials";
    route.fulfill({ json: { totalDocs: totals[collection] } });
  });
}

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const errors = [];
  const empty = {};
  let page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [href, { query }] of Object.entries(LISTING)) {
    empty[href] = (await (await page.request.get(`${API}/${query}`)).json()).totalDocs === 0;
  }
  const footer = await (await page.request.get(`${API}/globals/final-cta-footer?depth=0`)).json();
  const saved = (footer.footerNav || []).map((l) => l.href);
  r.lines.push(`(Backstage ${empty["/backstage"] ? "empty" : "has content"}, Testimonials ${empty["/testimonials"] ? "empty" : "has content"}; saved links ${JSON.stringify(saved)})`);

  section("names, 1400x950");
  await openFooter(page);
  const title = await page.title();
  check("page title says Footer", /Footer/.test(title) && !/Final CTA/.test(title), title);
  const heading = (await page.locator(".doc-header__title, h1").first().innerText()).trim();
  check("heading says Footer", heading === "Footer", heading);
  const crumbs = (await page.locator(".step-nav").innerText()).replace(/\s+/g, " ");
  check("breadcrumb says Footer", crumbs.includes("Footer") && !crumbs.includes("Final CTA"), crumbs);
  const nav = await page.locator(".site-nav__label").allInnerTexts();
  check("sidebar says Footer", nav.includes("Footer") && !nav.some((l) => /Final CTA/.test(l)), nav);

  section("column labels, 1400x950");
  let rows = await rowLabels(page);
  check("labels on every input: Label, Links to", rows.length > 0 && rows.every((row) => row.map((l) => l.text).join("|") === "Label|Links to"), rows);
  check("shown over the first row", rows[0]?.every((l) => l.visible && l.above), rows[0]);
  check("not repeated over the other rows", rows.slice(1).every((row) => row.every((l) => !l.visible)), rows.slice(1));
  check("each label belongs to its input", rows.flat().every((l) => l.forInput));

  section("note on a link to an empty page (real counts)");
  let notes = await rowNotes(page);
  for (const [href, { name }] of Object.entries(LISTING)) {
    const row = notes.find((n) => n.to === name || n.to === `${name} (page)`);
    if (!row) { r.lines.push(`(no ${name} link in the footer editor, note not checked)`); continue; }
    check(`${name} link: ${empty[href] ? "says it's hidden" : "no note (page has content)"}`, empty[href] ? row.notes.includes(noteFor(name)) : row.notes.length === 0, row.notes);
  }
  await page.locator(".nav-links").first().screenshot({ path: `${shots}/1-links-wide.png` });
  await page.close();

  // Both states of the note, whatever the real counts are.
  for (const [label, totals] of [
    ["Backstage empty, Testimonials has content (mocked)", { "/backstage": 0, "/testimonials": 2 }],
    ["both have content (mocked)", { "/backstage": 3, "/testimonials": 2 }],
  ]) {
    section(label);
    page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await mockCounts(page, totals);
    await openFooter(page);
    notes = await rowNotes(page);
    for (const [href, { name }] of Object.entries(LISTING)) {
      const row = notes.find((n) => n.to === name || n.to === `${name} (page)`);
      if (!row) continue;
      const want = totals[href] === 0;
      check(`${name} link: ${want ? "note" : "no note"}`, want ? JSON.stringify(row.notes) === JSON.stringify([noteFor(name)]) : row.notes.length === 0, row.notes);
    }
    const others = notes.filter((n) => !/^(Backstage|Testimonials)( \(page\))?$/.test(n.to ?? ""));
    check("other links have no note", others.every((n) => n.notes.length === 0), others);
    await page.close();
  }

  section("column labels, 390x844 phone");
  const phone = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  page = await phone.ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await openFooter(page);
  rows = await rowLabels(page);
  check("every row shows its labels", rows.length > 0 && rows.every((row) => row.length === 2 && row.every((l) => l.visible && l.above)), rows);
  await page.locator(".nav-links").first().scrollIntoViewIfNeeded();
  await page.locator(".nav-links").first().screenshot({ path: `${shots}/2-links-phone.png` });
  await checkNoSidewaysScroll(page, r, "no sideways scroll");
  await page.close();

  section("the site's footer (real counts)");
  for (const path of ["/", "/booking"]) {
    page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}${path}`, { timeout: 120000 });
    await page.locator("#footer").waitFor({ timeout: 60000 });
    const shown = await page.locator("#footer nav[aria-label='Footer'] a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    for (const [href, { name }] of Object.entries(LISTING)) {
      if (!saved.includes(href)) continue;
      check(`${path}: ${name} link ${empty[href] ? "hidden (page empty)" : "shown (page has content)"}`, shown.includes(href) === !empty[href], shown);
    }
    const others = saved.filter((href) => !LISTING[href]);
    check(`${path}: other links unaffected, in order`, JSON.stringify(shown.filter((h) => !LISTING[h])) === JSON.stringify(others), { others, shown });
    if (path === "/") await page.locator("#footer").screenshot({ path: `${shots}/3-site-footer.png` });
    await page.close();
  }

  section("Editor overview");
  page = await ctx.newPage();
  await page.goto(`${ADMIN}/editor`, { timeout: 120000 });
  await page.locator(".editor-overview").first().waitFor({ timeout: 60000 });
  const tiles = (await page.locator(".editor-overview").innerText()).split("\n").map((t) => t.trim());
  check("overview says Footer", tiles.includes("Footer") && !tiles.some((t) => /Final CTA/.test(t)), tiles);

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = [...guard.log, ...phone.guard.log].filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url));
  check("nothing tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
