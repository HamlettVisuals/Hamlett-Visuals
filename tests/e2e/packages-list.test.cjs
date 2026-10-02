// The Packages list: the title links to the package's edit page (underlined
// like album titles on Categories & Albums); the Photo column is the
// category's cover or a muted placeholder; a "Featured" tag marks the
// package in the homepage spotlight (only while it's showing) and links to
// the Featured Offer page; the drag handles and Live/Hidden pill are still
// there and the pill still flips; no sideways scroll on a phone. Spotlight
// states the live data doesn't have come from a mocked Featured Offer
// reply. The photo cell's cases are unit-tested (tests/unit/package-thumbnail).
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e packages-list` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN, API } = require("./lib/harness.cjs");

const r = report("packages-list");
const { check, section } = r;
const shots = outDir("packages-list");
const LIST = `${ADMIN}/collections/pricing-rows`;

async function openList(page) {
  await page.goto(LIST, { timeout: 120000 });
  await page.locator(".cell-title").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);
}

const tags = (page) => page.locator(".package-featured-tag").evaluateAll((els) =>
  els.map((el) => ({ row: el.closest("tr")?.querySelector(".package-title-cell__link")?.textContent, href: el.getAttribute("href") })));

(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  const errors = [];
  const watch = (p) => p.on("pageerror", (e) => errors.push(e.message));
  let page = await ctx.newPage();
  watch(page);

  const { docs } = await (await page.request.get(`${API}/pricing-rows?depth=1&limit=100&sort=_order`)).json();
  const featured = await (await page.request.get(`${API}/globals/featured-offer?depth=2`)).json();
  r.lines.push(`(${docs.length} package(s); spotlight switch ${featured.showOnHomepage}, package ${featured.featuredPackage?.id})`);

  section("title link, 1440x950");
  await openList(page);
  const titles = await page.locator(".cell-title").evaluateAll((cells) => cells.map((c) => {
    const a = c.querySelector("a.package-title-cell__link");
    const cs = a && getComputedStyle(a);
    return { text: a?.textContent, href: a?.getAttribute("href"), underline: cs?.textDecorationLine, weight: cs?.fontWeight };
  }));
  check("every title is a link to its edit page", titles.length === docs.length && titles.every((t, i) => t.href === `/hv-studio/collections/pricing-rows/${docs[i].id}`), titles);
  check("underlined and bold, like album titles", titles.every((t) => t.underline === "underline" && Number(t.weight) >= 600), titles[0]);
  await page.locator("a.package-title-cell__link").first().click();
  await page.waitForURL(/\/collections\/pricing-rows\/\d+$/, { timeout: 30000 });
  check("clicking the title opens the edit page", page.url().endsWith(`/collections/pricing-rows/${docs[0].id}`), page.url());

  section("photo column");
  await openList(page);
  const photos = await page.locator(".cell-thumbnail").evaluateAll((cells) => cells.map((c) => {
    const img = c.querySelector("img.category-thumb");
    const empty = c.querySelector(".category-thumb--empty");
    return { img: img?.getAttribute("src") || null, empty: empty?.getAttribute("aria-label") || null };
  }));
  for (const [i, pkg] of docs.entries()) {
    const cat = pkg.category;
    const coverId = cat?.coverPhoto && typeof cat.coverPhoto === "object" ? cat.coverPhoto.id : cat?.coverPhoto;
    check(`"${pkg.title}": ${coverId ? "category cover shown" : `placeholder (${cat?.name} has no cover)`}`,
      coverId ? Boolean(photos[i]?.img) : photos[i]?.empty === `No cover photo for ${cat?.name}`, photos[i]);
  }

  section("Featured tag (saved data)");
  let found = await tags(page);
  const spotOn = featured.showOnHomepage !== false && featured.featuredPackage && featured.featuredPackage.published && featured.featuredPackage.category?.published;
  check(spotOn ? `tag on "${featured.featuredPackage.title}" only` : "no tag (spotlight not showing)",
    spotOn ? found.length === 1 && found[0].row === featured.featuredPackage.title : found.length === 0, found);
  if (found.length) {
    check("tag links to the Featured Offer page", found[0].href === "/hv-studio/globals/featured-offer", found[0]);
    await page.screenshot({ path: `${shots}/1-list.png` });
    await page.locator(".package-featured-tag").click();
    await page.waitForURL(/\/globals\/featured-offer/, { timeout: 30000 });
    check("clicking the tag opens Featured Offer", true);
  }
  await page.close();

  section("Featured tag (mocked spotlight)");
  const pkg = docs[0];
  const asFeatured = (over) => ({ ...featured, showOnHomepage: true, featuredPackage: { ...pkg, published: true, category: { ...pkg.category, published: true } }, ...over });
  const cases = [
    ["switch off", asFeatured({ showOnHomepage: false }), 0],
    ["switch on, this package", asFeatured({}), 1],
    ["older save (no switch value)", asFeatured({ showOnHomepage: null }), 1],
    ["package hidden", asFeatured({ featuredPackage: { ...pkg, published: false, category: { ...pkg.category, published: true } } }), 0],
    ["its category hidden", asFeatured({ featuredPackage: { ...pkg, published: true, category: { ...pkg.category, published: false } } }), 0],
    ["another package", asFeatured({ featuredPackage: { ...pkg, id: 999999, published: true, category: { ...pkg.category, published: true } } }), 0],
    ["no package picked", asFeatured({ featuredPackage: null }), 0],
  ];
  for (const [label, body, want] of cases) {
    page = await ctx.newPage();
    watch(page);
    await page.route(/\/api\/globals\/featured-offer\?depth=2/, (route) => route.fulfill({ json: body }));
    await openList(page);
    found = await tags(page);
    check(`${label}: ${want ? "tag" : "no tag"}`, found.length === want, found);
    await page.close();
  }

  section("drag handles and Live/Hidden pill");
  page = await ctx.newPage();
  watch(page);
  await openList(page);
  check("a drag handle on every row", (await page.locator("tbody tr .cell-_dragHandle button, tbody tr [aria-roledescription='sortable'], tbody tr .sort-row").count()) >= docs.length);
  const pill = page.locator(".cell-published .category-status").first();
  const before = (await pill.innerText()).trim();
  await pill.click();
  await page.waitForTimeout(1500);
  const after = (await pill.innerText()).trim();
  const patches = guard.log.filter((e) => e.kind !== "pass" && /\/api\/pricing-rows\/\d+/.test(e.url));
  check(`pill flips ${before} → ${after === before ? "(no change)" : after}`, after !== before && /Live|Hidden/.test(after), { before, after });
  check("the flip is a (faked) save of that package", patches.length === 1, patches.map((e) => e.url));
  await page.close();
  if (docs.length < 2) r.lines.push("(only one package, so a drag can't be tried; the reorder code is unchanged)");

  // Phones and a landscape phone: the row fits inside the page gutters
  // (no sideways scroll, grey background stops short of the right edge),
  // the drag handle is exactly its 44px tap target, the title wraps and
  // category · price stack under it. Then a worst-case title (28
  // characters, the cap) plus the Featured tag, put in the page by hand.
  const guards = [guard];
  const overlap = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const measure = (p) => p.evaluate(() => {
    const box = (el) => el && (({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }))(el.getBoundingClientRect());
    const wrap = document.querySelector(".table");
    const row = document.querySelector("tbody tr");
    const link = row.querySelector(".package-title-cell__link");
    const range = document.createRange();
    range.selectNodeContents(link);
    const visible = [...row.children].filter((td) => td.getBoundingClientRect().width > 0).map((td) => td.className.split(" ").find((c) => c.startsWith("cell-")));
    return {
      vw: document.documentElement.clientWidth,
      wrapScroll: wrap.scrollWidth - wrap.clientWidth,
      row: box(row), handle: box(row.querySelector(".cell-_dragHandle [aria-roledescription='sortable']")),
      handleCell: box(row.querySelector(".cell-_dragHandle")),
      title: box(range), tag: box(row.querySelector(".package-featured-tag")),
      meta: box(row.querySelector(".album-title-cell__meta")), pill: box(row.querySelector(".cell-published .category-status")),
      metaShown: getComputedStyle(row.querySelector(".album-title-cell__meta")).display !== "none",
      visible,
    };
  });
  for (const [w, h] of [[375, 667], [390, 844], [844, 390]]) {
    section(`${w}x${h}`);
    const small = await newContext(browser, { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    guards.push(small.guard);
    page = await small.ctx.newPage();
    watch(page);
    await openList(page);
    await checkNoSidewaysScroll(page, r, "no sideways scroll (page)");
    let m = await measure(page);
    const phoneWidth = w <= 768;
    check("the table doesn't scroll sideways", m.wrapScroll <= 0, m.wrapScroll);
    check("row inside the gutters (background stops before the right edge)", m.row.left >= 15 && m.row.right <= m.vw - 15, { left: m.row.left, right: m.row.right, vw: m.vw });
    check("drag handle is a 44x44 tap target filling its column", Math.round(m.handle.width) === 44 && Math.round(m.handle.height) === 44 && Math.round(m.handleCell.width) === 44, { handle: m.handle, cell: m.handleCell.width });
    check(phoneWidth ? "columns: handle, photo, title, pill" : "columns: handle, photo, title, category, price, pill",
      JSON.stringify(m.visible) === JSON.stringify(phoneWidth
        ? ["cell-_dragHandle", "cell-thumbnail", "cell-title", "cell-published"]
        : ["cell-_dragHandle", "cell-thumbnail", "cell-title", "cell-category", "cell-priceAmount", "cell-published"]), m.visible);
    if (phoneWidth) check("category · price stacked under the title", m.metaShown && m.meta.top >= m.title.bottom - 1, { title: m.title, meta: m.meta });
    check("pill fully on screen", m.pill.right <= m.vw - 8, m.pill);
    if (m.tag) check("Featured tag small, clear of the title and the line under it", m.tag.height < 30 && !overlap(m.tag, m.title) && !(m.metaShown && overlap(m.tag, m.meta)), { tag: m.tag, title: m.title, meta: m.meta });
    await page.screenshot({ path: `${shots}/2-${w}x${h}.png` });
    // Worst case: the longest title allowed, with the tag.
    await page.evaluate(() => {
      const link = document.querySelector("tbody tr .package-title-cell__link");
      link.textContent = "Wedding Day Full Coverage XL";
      if (!document.querySelector("tbody tr .package-featured-tag")) {
        const tag = document.createElement("a");
        tag.className = "package-featured-tag";
        tag.textContent = "Featured";
        link.after(tag);
      }
    });
    await page.waitForTimeout(300);
    m = await measure(page);
    check("28-character title: still fits, no sideways scroll", m.wrapScroll <= 0 && m.row.right <= m.vw - 15 && m.pill.right <= m.vw - 8, { wrapScroll: m.wrapScroll, row: m.row.right, pill: m.pill.right, vw: m.vw });
    check("28-character title: tag doesn't overlap it", !overlap(m.tag, m.title), { tag: m.tag, title: m.title });
    await page.screenshot({ path: `${shots}/3-${w}x${h}-long-title.png` });
    await page.close();
  }

  section("desktop 1440x950 unchanged");
  page = await ctx.newPage();
  watch(page);
  await openList(page);
  const d = await measure(page);
  // The same boxes as before this change (row 60..1380, handle cell 48, 20px handle).
  check("row, handle cell and handle as before", Math.round(d.row.left) === 60 && Math.round(d.row.right) === 1380 && Math.round(d.handleCell.width) === 48 && Math.round(d.handle.width) === 20,
    { row: [d.row.left, d.row.right], cell: d.handleCell.width, handle: d.handle.width });
  check("all columns shown", d.visible.length === 6, d.visible);
  await page.close();

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guards.flatMap((g) => g.log).filter((e) => e.kind !== "pass" && !/payload-preferences|\/access\//.test(e.url) && !/\/api\/pricing-rows\/\d+/.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
