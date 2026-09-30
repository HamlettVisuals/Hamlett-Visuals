// Reordering on Categories & Albums, with a mouse (desktop) and by
// press-and-hold touch (phone): dragging a category collapses every section
// and lifts it, the drop shows the new order and saves through
// /api/categories/reorder-categories (faked); an album drag inside Test saves
// through /api/events/reorder-albums (faked); on touch a quick swipe on a
// handle doesn't drag and a swipe elsewhere scrolls; a failed save puts the
// order back and says why; searching turns reordering off. Reads the live
// test data (category ids 11, 26, 27, 28, 13; Test's albums 17, 16, 15).
const { launchBrowser, newContext, report, outDir, ADMIN } = require("./lib/harness.cjs");

const BASE = ADMIN;
const r = report("portfolio-reorder");
const { check } = r;
const shots = outDir("portfolio-reorder");

const state = (page) => page.evaluate(() => ({
  order: [...document.querySelectorAll('.portfolio__sections > .portfolio__section:not(.unused-photos) .portfolio__name')].map((n) => n.innerText),
  openSections: [...document.querySelectorAll('.portfolio__section:not(.unused-photos)')].filter((s) => s.querySelector('.portfolio__body')).map((s) => s.querySelector('.portfolio__name').innerText),
  overlay: document.querySelector('.portfolio__head--lifted .portfolio__name')?.innerText ?? null,
  albums: [...document.querySelectorAll('#category-test .portfolio__album-title')].map((a) => a.innerText),
  error: document.querySelector('.portfolio__error')?.innerText ?? null,
}));

(async () => {
  const browser = await launchBrowser();
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    r.section(`${w}x${h} (${touch ? 'touch' : 'mouse'})`);
    const { ctx, guard } = await newContext(browser, { viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 });
    const log = { some: (test) => guard.lines().some(test) };
    const page = await ctx.newPage();
    const bodies = [];
    page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/(reorder|events\/reorder-albums|categories\/reorder-categories)/.test(r.url())) bodies.push({ url: r.url().replace(/.*\/api/, '/api'), body: JSON.parse(r.postData() || '{}') }); });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 150)));
    await page.goto(BASE + '/portfolio', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    const cdp = touch ? await ctx.newCDPSession(page) : null;
    const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

    // Open Test first
    const openTest = page.locator('#category-test .portfolio__toggle');
    touch ? await openTest.tap() : await openTest.click();
    await page.waitForTimeout(300);

    // --- Category drag: Motorsports below Real Estate
    const handle = await page.locator('#category-motorsports .portfolio__handle').boundingBox();
    const hx = handle.x + handle.width / 2, hy = handle.y + handle.height / 2;
    const target = await page.locator('#category-real-estate .portfolio__head').boundingBox();
    const before = bodies.length;
    if (touch) {
      await tp('touchStart', [{ x: hx, y: hy }]); await page.waitForTimeout(400);
      await tp('touchMove', [{ x: hx, y: hy + 8 }]); await page.waitForTimeout(150);
    } else {
      await page.mouse.move(hx, hy); await page.mouse.down();
      await page.mouse.move(hx, hy + 10, { steps: 3 }); await page.waitForTimeout(150);
    }
    const mid = await state(page);
    check('grabbing a category collapses every section and lifts it', mid.openSections.length === 0 && mid.overlay === 'Motorsports', mid);
    await page.screenshot({ path: `${shots}/drag-mid@${w}.png` });
    // Real Estate moved up after the collapse: aim below its current centre
    const re = await page.locator('#category-real-estate .portfolio__head').boundingBox();
    const ty = re.y + re.height * 0.8;
    for (let i = 1; i <= 12; i++) {
      const y = hy + ((ty - hy) * i) / 12;
      touch ? await tp('touchMove', [{ x: hx, y }]) : await page.mouse.move(hx, y);
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(200);
    touch ? await tp('touchEnd', []) : await page.mouse.up();
    await page.waitForTimeout(120);
    const after = await state(page);
    check('drop: new order shown, Test open again', JSON.stringify(after.order) === '["Weddings","Test","Real Estate","Motorsports","Other"]' && JSON.stringify(after.openSections) === '["Test"]', after);
    await page.waitForTimeout(800);
    const catReq = bodies.slice(before).find((b) => b.url.startsWith('/api/categories/reorder-categories'));
    check('saves through /api/categories/reorder-categories {order, moved} (faked)', !!catReq && JSON.stringify(catReq.body) === '{"order":[11,27,28,26,13],"moved":26}', catReq);
    check("…not through Payload's /api/reorder", !bodies.slice(before).some((b) => b.url.startsWith('/api/reorder')));
    check('…the write was faked', log.some((l) => /FAKED POST .*\/api\/categories\/reorder-categories/.test(l)));

    // --- Album drag inside Test: Cars Test to the top
    await page.goto(BASE + '/portfolio#category-test', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    const rows = page.locator('#category-test .portfolio__album');
    const cars = await rows.nth(2).locator('.portfolio__handle').boundingBox();
    const maisy = await rows.nth(0).boundingBox();
    const cx = cars.x + cars.width / 2, cy = cars.y + cars.height / 2;
    const my = maisy.y + 6;
    const beforeA = bodies.length;
    if (touch) { await tp('touchStart', [{ x: cx, y: cy }]); await page.waitForTimeout(400); } else { await page.mouse.move(cx, cy); await page.mouse.down(); }
    for (let i = 1; i <= 14; i++) {
      const y = cy + ((my - cy) * i) / 14;
      touch ? await tp('touchMove', [{ x: cx, y }]) : await page.mouse.move(cx, y);
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(150);
    const midA = await state(page);
    check('album drag keeps the section open (others unaffected)', midA.openSections.includes('Test'), midA.openSections);
    touch ? await tp('touchEnd', []) : await page.mouse.up();
    await page.waitForTimeout(120);
    const afterA = await state(page);
    check('album drop: Cars Test first', JSON.stringify(afterA.albums) === '["Cars Test","Maisy Test","Vacation Test"]', afterA.albums);
    await page.waitForTimeout(800);
    const albReq = bodies.slice(beforeA).find((b) => b.url.startsWith('/api/events/reorder-albums'));
    check('saves through /api/events/reorder-albums {category 27, order, moved} (faked)', !!albReq && albReq.body.category === 27 && JSON.stringify(albReq.body.order) === '[15,17,16]' && albReq.body.moved === 15, albReq);

    if (touch) {
      // A quick swipe (no hold) on a handle doesn't start a drag; a swipe on the page scrolls it.
      const hb = await page.locator('#category-weddings .portfolio__handle').boundingBox();
      const n = bodies.length;
      await tp('touchStart', [{ x: hb.x + 10, y: hb.y + 10 }]);
      for (let i = 1; i <= 6; i++) { await tp('touchMove', [{ x: hb.x + 10, y: hb.y + 10 + i * 20 }]); await page.waitForTimeout(16); }
      const noDrag = await state(page);
      await tp('touchEnd', []); await page.waitForTimeout(400);
      check('quick swipe on a handle (no hold) doesn\'t drag', noDrag.overlay === null && bodies.length === n, noDrag.overlay);
      await page.evaluate(() => scrollTo(0, 0));
      const t = await page.locator('#category-test .portfolio__name').boundingBox();
      await tp('touchStart', [{ x: t.x + 20, y: t.y + 200 }]);
      for (let i = 1; i <= 10; i++) { await tp('touchMove', [{ x: t.x + 20, y: t.y + 200 - i * 25 }]); await page.waitForTimeout(16); }
      await tp('touchEnd', []); await page.waitForTimeout(500);
      check('a swipe elsewhere scrolls the page', (await page.evaluate(() => scrollY)) > 50, await page.evaluate(() => scrollY));
    }

    // --- A failed save puts the order back and says why
    await page.goto(BASE + '/portfolio#category-test', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await page.route('**/api/events/reorder-albums', (r) => r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'This list changed somewhere else. Reload the page and try again.' }) }));
    const r2 = page.locator('#category-test .portfolio__album');
    const v = await r2.nth(1).locator('.portfolio__handle').boundingBox();
    const top = await r2.nth(0).boundingBox();
    if (touch) { await tp('touchStart', [{ x: v.x + 10, y: v.y + 10 }]); await page.waitForTimeout(400); } else { await page.mouse.move(v.x + 10, v.y + 10); await page.mouse.down(); }
    for (let i = 1; i <= 10; i++) { const y = v.y + 10 + (top.y + 4 - (v.y + 10)) * i / 10; touch ? await tp('touchMove', [{ x: v.x + 10, y }]) : await page.mouse.move(v.x + 10, y); await page.waitForTimeout(25); }
    touch ? await tp('touchEnd', []) : await page.mouse.up();
    await page.waitForTimeout(900);
    const failed = await state(page);
    check('failed save: order goes back, reason shown', JSON.stringify(failed.albums) === '["Maisy Test","Vacation Test","Cars Test"]' && /wasn.t saved: This list changed/.test(failed.error || ''), failed);
    await page.unroute('**/api/events/reorder-albums');

    // --- Searching turns reordering off
    await page.locator('.portfolio__search-input').fill('Test');
    await page.waitForTimeout(200);
    const disabled = await page.evaluate(() => [...document.querySelectorAll('button.portfolio__handle')].every((b) => b.disabled));
    check('while searching, handles are disabled', disabled);
    check('no page errors', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
