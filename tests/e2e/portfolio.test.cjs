// Categories & Albums (/hv-studio/portfolio) at desktop, phone and
// landscape phone: sections in her order with "Other" last and muted, all
// closed to start, each header's handle, cover, count, Live/Hidden pill and
// links; an open category's albums; the pill toggle (faked); search; the old
// list URLs redirecting here; #category-<slug>; the sidebar and Editor
// overview. The Unused photos section at the bottom has its own tests.
// Reads the live test data (Weddings, Motorsports, Test, Real Estate, Other).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, ADMIN } = require("./lib/harness.cjs");

const BASE = ADMIN;
const r = report("portfolio");
const { check } = r;
const shots = outDir("portfolio");
// Category sections only (not Unused photos, which shares their look).
const SECTIONS = ".portfolio__section:not(.unused-photos)";

(async () => {
  const browser = await launchBrowser();
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true], [844, 390, true]]) {
    r.section(`${w}x${h}`);
    const { ctx, guard } = await newContext(browser, { viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 });
    const log = { get length() { return guard.log.length; }, slice: (n) => guard.lines().slice(n) };
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 150)));
    const tap = (loc) => (touch ? loc.tap() : loc.click());

    await page.goto(BASE + '/portfolio', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    const info = await page.evaluate((SECTIONS) => {
      const secs = [...document.querySelectorAll(SECTIONS)];
      return {
        h1: document.querySelector('.portfolio__title')?.innerText,
        addCategory: [...document.querySelectorAll('a')].find((a) => a.innerText.trim() === '+ Add category')?.getAttribute('href'),
        blackAddAlbum: [...document.querySelectorAll('.portfolio__intro a')].some((a) => /Add album/.test(a.innerText)),
        order: secs.map((s) => s.querySelector('.portfolio__name')?.innerText),
        allCollapsed: secs.every((s) => !s.querySelector('.portfolio__albums') && !s.querySelector('.portfolio__empty')),
        headers: secs.map((s) => ({
          name: s.querySelector('.portfolio__name')?.innerText,
          handle: !!s.querySelector('.portfolio__handle'),
          thumb: s.querySelector('.portfolio__thumb')?.tagName,
          count: s.querySelector('.portfolio__count')?.innerText ?? null,
          pill: s.querySelector('.category-status')?.innerText.trim(),
          edit: [...s.querySelectorAll('a')].find((a) => a.innerText === 'Edit category')?.getAttribute('href'),
          add: [...s.querySelectorAll('a')].find((a) => a.innerText === '+ Add album')?.getAttribute('href') ?? null,
          muted: s.classList.contains('portfolio__section--muted'),
        })),
      };
    }, SECTIONS);
    check('title and "+ Add category" (no black "+ Add album")', info.h1 === 'Categories & Albums' && /\/collections\/categories\/create$/.test(info.addCategory || '') && !info.blackAddAlbum, info.addCategory);
    check('sections in her order, "Other" last', JSON.stringify(info.order) === '["Weddings","Motorsports","Test","Real Estate","Other"]', info.order.join(', '));
    check('all sections start collapsed', info.allCollapsed);
    const byName = Object.fromEntries(info.headers.map((x) => [x.name, x]));
    check('Test header: handle, cover, count 3, Live, Edit → /categories/27, Add → create?category=27',
      byName.Test.handle && byName.Test.thumb === 'IMG' && byName.Test.count === '3' && byName.Test.pill === 'Live' && /\/collections\/categories\/27$/.test(byName.Test.edit) && /\/collections\/events\/create\?category=27$/.test(byName.Test.add), byName.Test);
    check('"Other": muted, Edit only, no + Add album, no handle, CRM only', byName.Other.muted && !byName.Other.add && !byName.Other.handle && /categories\/13$/.test(byName.Other.edit) && byName.Other.pill === 'CRM only', byName.Other);
    await checkNoSidewaysScroll(page, r, 'no sideways scroll');

    // Expand Test
    await tap(page.locator('#category-test .portfolio__toggle'));
    await page.waitForTimeout(300);
    const test = await page.evaluate(() => [...document.querySelectorAll('#category-test .portfolio__album')].map((r) => ({
      title: r.querySelector('.portfolio__album-title').innerText, date: r.querySelector('.portfolio__date').innerText,
      pill: r.querySelector('.category-status').innerText.trim(), thumb: r.querySelector('.portfolio__thumb').tagName, handle: !!r.querySelector('.portfolio__handle'),
    })));
    check('expanded Test: albums in her order with thumb, date, Live', JSON.stringify(test.map((a) => a.title)) === '["Maisy Test","Vacation Test","Cars Test"]' && test.every((a) => a.thumb === 'IMG' && a.handle && a.pill), test);
    await tap(page.locator('#category-weddings .portfolio__toggle'));
    const empty = await page.locator('#category-weddings .portfolio__empty').innerText().catch(() => null);
    check('empty category says "No albums yet"', empty === 'No albums yet', empty);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${shots}/portfolio@${w}x${h}.png`, fullPage: true });
    await checkNoSidewaysScroll(page, r, 'no sideways scroll with sections open');

    if (w === 1440 || w === 390) {
      // Header Live/Hidden toggle (faked)
      const before = log.length;
      await tap(page.locator('#category-motorsports .category-status'));
      await page.waitForTimeout(700);
      const faked = log.slice(before).find((l) => /PATCH .*\/api\/categories\/26/.test(l));
      check('header pill toggles the category (faked PATCH)', (await page.locator('#category-motorsports .category-status').innerText()).trim() === 'Hidden' && !!faked, faked);

      // Search
      const search = page.locator('.portfolio__search-input');
      await search.fill('Maisy');
      await page.waitForTimeout(200);
      let s = await page.evaluate((SECTIONS) => ({ secs: [...document.querySelectorAll(SECTIONS)].map((x) => x.querySelector('.portfolio__name').innerText), rows: [...document.querySelectorAll('.portfolio__album-title')].map((x) => x.innerText) }), SECTIONS);
      check('search "Maisy" → Test section, open, only Maisy Test', JSON.stringify(s) === '{"secs":["Test"],"rows":["Maisy Test"]}', s);
      await search.fill('motor');
      await page.waitForTimeout(200);
      s = await page.evaluate((SECTIONS) => [...document.querySelectorAll(SECTIONS)].map((x) => x.querySelector('.portfolio__name').innerText), SECTIONS);
      check('search "motor" → Motorsports (by category name)', JSON.stringify(s) === '["Motorsports"]', s);
      await search.fill('zzqq');
      await page.waitForTimeout(200);
      const none = await page.locator('.albums-empty').innerText().catch(() => '');
      check('no match → "Nothing matches your search"', /Nothing matches your search/.test(none), none.replace(/\s+/g, ' '));
      await tap(page.getByRole('button', { name: 'Show everything' }));
      check('"Show everything" clears it', (await page.locator(SECTIONS).count()) === 5);

      // Redirects and deep link
      for (const [from, label] of [['/collections/categories', 'Categories list'], ['/collections/events', 'Albums list']]) {
        await page.goto(BASE + from, { waitUntil: 'networkidle' });
        check(`${label} URL redirects to Categories & Albums`, new URL(page.url()).pathname === '/hv-studio/portfolio', page.url());
      }
      await page.goto(BASE + '/collections/events#category-test', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
      // Scrolled to Test: near the top, or as far as the page goes (on a tall
      // screen the page can be too short to bring it all the way up).
      const deep = await page.evaluate(() => ({
        url: location.pathname + location.hash,
        open: document.querySelector('#category-test .portfolio__toggle')?.getAttribute('aria-expanded'),
        top: Math.round(document.getElementById('category-test').getBoundingClientRect().top),
        atMaxScroll: Math.round(scrollY) >= document.documentElement.scrollHeight - innerHeight - 1,
      }));
      check('#category-test (through the redirect) opens and scrolls to Test', deep.url === '/hv-studio/portfolio#category-test' && deep.open === 'true' && (deep.top < 200 || deep.atMaxScroll), deep);

      // Sidebar and Editor overview
      await page.goto(BASE + '/portfolio', { waitUntil: 'networkidle' });
      if (touch) { await page.locator('.app-header__mobile-nav-toggler, .template-default__nav-toggler').locator('visible=true').first().tap(); await page.waitForTimeout(500); }
      const nav = await page.evaluate(() => [...document.querySelectorAll('.site-nav__label')].map((a) => a.innerText.trim() + (a.closest('.site-nav__row--active') ? ' [active]' : '')));
      check('sidebar: "Categories & Albums" (active), no separate Categories/Albums', nav.includes('Categories & Albums [active]') && !nav.some((n) => /^(Categories|Albums)( \[active\])?$/.test(n)), nav.filter((n) => /Categ|Album|Photo|Intro/.test(n)));
      await page.goto(BASE + '/collections/events/16', { waitUntil: 'networkidle' });
      if (touch) { await page.locator('.app-header__mobile-nav-toggler, .template-default__nav-toggler').locator('visible=true').first().tap(); await page.waitForTimeout(500); }
      const navOnAlbum = await page.evaluate(() => [...document.querySelectorAll('.site-nav__row--active .site-nav__label')].map((a) => a.innerText.trim()));
      check('sidebar highlights it on an album\'s edit page', navOnAlbum.includes('Categories & Albums'), navOnAlbum);
      await page.goto(BASE + '/editor', { waitUntil: 'networkidle' });
      const cards = await page.evaluate(() => [...document.querySelectorAll('.editor-overview__sublinks a')].map((a) => `${a.innerText} → ${a.getAttribute('href')}`));
      check('Editor overview: "Categories & Albums" card link', cards.some((c) => c === 'Categories & Albums → /hv-studio/portfolio') && !cards.some((c) => /^(Categories|Albums) →/.test(c)), cards.filter((c) => /Categ|Album|Photo/.test(c)));
    }
    check('no page errors', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
