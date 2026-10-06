// The homepage Instagram section (components/home/Instagram.tsx):
//   - signed out, as saved: either a grid (9 tiles for one account, two
//     labelled blocks of 6 for both) or the heading and a Follow link, never
//     broken tiles; every tile 4:5, linking to its post in a new tab, its
//     caption as alt text, a play / stacked badge on videos and carousels,
//     images loading; blocks side by side at 1440 and stacked at 390; no
//     sideways scroll;
//   - in the studio's Live Preview, with unsaved changes: one account on (a
//     grid of 9, featured picks first in her order), both on (6 + 6, when
//     both accounts are connected here), both off (heading + Follow only)
//     and the section off (gone).
// Read-only signed out; in the studio every write is faked by the shared
// guard (lib/guard.cjs) and nothing is saved.
// Run with `npm run test:e2e instagram-home` (see README.md).
const { launchBrowser, newContext, report, outDir, checkNoSidewaysScroll, BASE, ADMIN } = require("./lib/harness.cjs");

const r = report("instagram-home");
const { check, section } = r;
const shots = outDir("instagram-home");

// What the section shows, from inside the page (or the preview frame).
const read = (el) => {
  const tiles = [...el.querySelectorAll("li > a")];
  const blocks = [...el.querySelectorAll("[data-instagram-account]")];
  return {
    heading: el.querySelector("h2")?.textContent.trim(),
    follow: [...el.querySelectorAll("a")].filter((a) => /^Follow @/.test(a.textContent.trim())).map((a) => ({ text: a.textContent.trim(), href: a.href, target: a.target })),
    blocks: blocks.map((b) => ({ title: b.querySelector("h3")?.textContent.trim(), tiles: b.querySelectorAll("li").length, top: Math.round(b.getBoundingClientRect().top) })),
    tiles: tiles.map((a) => {
      const frame = a.querySelector(".hover-zoom");
      const img = a.querySelector("img");
      const badge = a.querySelector("span[aria-hidden='true'] svg");
      return {
        href: a.href,
        target: a.target,
        rel: a.rel,
        type: a.dataset.mediaType,
        ratio: frame ? frame.clientWidth / frame.clientHeight : 0,
        alt: img?.alt ?? "",
        loaded: Boolean(img?.complete && img.naturalWidth > 0),
        badge: Boolean(badge),
        radius: getComputedStyle(a).borderTopLeftRadius,
      };
    }),
  };
};

function checkTiles(info, label) {
  const tiles = info.tiles;
  check(`${label}: every tile is 4:5`, tiles.every((t) => Math.abs(t.ratio - 0.8) < 0.01), tiles.map((t) => t.ratio.toFixed(3)));
  check(`${label}: every tile opens its post on Instagram in a new tab`, tiles.every((t) => t.href.startsWith("https://www.instagram.com/") && t.target === "_blank" && /noopener/.test(t.rel)));
  check(`${label}: every tile has its caption as alt text`, tiles.every((t) => t.alt.trim().length > 0));
  check(`${label}: a badge on exactly the videos and carousels`, tiles.every((t) => t.badge === (t.type !== "image")), tiles.map((t) => `${t.type}:${t.badge}`));
  check(`${label}: softened corners (4px)`, tiles.every((t) => t.radius === "4px"), [...new Set(tiles.map((t) => t.radius))]);
}

async function scrollThrough(page, selector) {
  // Lazy images load as they come into view.
  const el = page.locator(selector);
  const box = await el.boundingBox();
  for (let y = box.y; y < box.y + box.height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await launchBrowser();
  const errors = [];

  // ---- signed out, as saved
  for (const [name, viewport] of [["1440", { width: 1440, height: 950 }], ["390", { width: 390, height: 844, isMobile: true }]]) {
    section(`homepage at ${name}, signed out`);
    const { isMobile, ...size } = viewport;
    const ctx = await browser.newContext({ viewport: size, isMobile: Boolean(isMobile), hasTouch: Boolean(isMobile) });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const broken = [];
    page.on("response", (res) => /instagram-posts/.test(res.url()) && res.status() >= 400 && broken.push(`${res.status()} ${res.url()}`));
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 180000 });
    if (!(await page.locator("#instagram").count())) {
      check("section present (switched on, with a username)", false, "no #instagram");
      await ctx.close();
      continue;
    }
    await scrollThrough(page, "#instagram");
    const info = await page.locator("#instagram").evaluate(read);
    r.lines.push(`(${name}: ${info.tiles.length} tiles, ${info.blocks.length} blocks)`);
    check("a heading", Boolean(info.heading), info.heading);
    check("at least one Follow @handle link, to a profile, in a new tab", info.follow.length >= 1 && info.follow.every((f) => /^https:\/\/www\.instagram\.com\/[^/]+\/$/.test(f.href) && f.target === "_blank"), info.follow);
    if (info.tiles.length === 0) {
      check("no grid: the heading and one Follow link only", info.follow.length === 1 && info.blocks.length === 0);
    } else if (info.blocks.length === 0) {
      check("one account: 9 tiles", info.tiles.length === 9, info.tiles.length);
    } else {
      check("both accounts: two labelled blocks of 6", info.blocks.length === 2 && info.blocks.every((b) => b.tiles === 6 && b.title), info.blocks);
      check("each block has its own Follow link", info.follow.length === 2, info.follow);
      check(name === "1440" ? "side by side at 1440" : "stacked at 390", name === "1440" ? info.blocks[0].top === info.blocks[1].top : info.blocks[1].top > info.blocks[0].top, info.blocks.map((b) => b.top));
    }
    if (info.tiles.length) {
      checkTiles(info, "saved");
      check("every image loaded", info.tiles.every((t) => t.loaded), info.tiles.map((t) => t.loaded));
    }
    check("no failed image or post requests", broken.length === 0, broken.slice(0, 3));
    await checkNoSidewaysScroll(page, r, `no sideways scroll at ${name}`);
    await page.locator("#instagram").screenshot({ path: `${shots}/saved-${name}.png` });
    await ctx.close();
  }

  // ---- Live Preview, unsaved
  section("Live Preview (unsaved changes)");
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1600, height: 1100 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const statusRes = await page.request.get(`${BASE}/api/instagram/status`);
  const status = await statusRes.json();
  const connected = status.accounts.filter((a) => a.status === "connected").map((a) => a.slot);
  r.lines.push(`(connected here: ${JSON.stringify(connected)}, mock allowed: ${status.mockAllowed})`);
  await page.goto(`${ADMIN}/globals/instagram-section`, { timeout: 120000 });
  await page.locator(".ig-account__header").first().waitFor({ timeout: 60000 });
  // Payload opens Live Preview itself shortly after load (openByDefault);
  // only open it if it stayed closed.
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);
  if (!(await page.locator(".live-preview-window--is-live-previewing").count())) await page.locator(".live-preview-toggler").first().click();
  await page.locator(".live-preview-window--is-live-previewing").waitFor({ timeout: 30000 });
  const frame = page.frameLocator(".live-preview-window iframe");
  await frame.locator("#instagram").waitFor({ state: "attached", timeout: 60000 });
  await page.waitForTimeout(2500);
  const preview = async () => {
    await page.waitForTimeout(3500);
    return (await frame.locator("#instagram").count()) ? frame.locator("#instagram").evaluate(read) : null;
  };
  const card = (i) => page.locator(".ig-accounts .array-field__row").nth(i);
  const visible = (i) => card(i).locator(".ig-visible button[role=switch]");
  const setVisible = async (i, on) => {
    if ((await visible(i).isDisabled()) || (await visible(i).getAttribute("aria-checked")) === String(on)) return;
    await visible(i).click();
  };
  // Start from no picks, so the grid order is known.
  for (const i of [0, 1]) while (await card(i).locator(".ig-featured__remove").count()) await card(i).locator(".ig-featured__remove").first().click();

  if (connected.includes(1)) {
    await setVisible(0, true);
    await setVisible(1, false);
    let info = await preview();
    check("main account only: a grid of 9", info?.tiles.length === 9 && info.blocks.length === 0, info && info.tiles.length);
    if (info) checkTiles(info, "preview");

    // Featured picks lead, in her order: the two oldest, last first.
    await card(0).getByRole("button", { name: "Add posts" }).click();
    const choices = card(0).locator(".ig-featured__choice");
    const n = await choices.count();
    const first = await choices.nth(n - 1).getAttribute("title");
    await choices.nth(n - 1).click();
    const second = await choices.nth(n - 2).getAttribute("title");
    await choices.nth(n - 2).click();
    info = await preview();
    check("featured picks lead the grid in her order", JSON.stringify(info?.tiles.slice(0, 2).map((t) => t.alt)) === JSON.stringify([first, second]), info?.tiles.slice(0, 3).map((t) => t.alt));
    check("still 9 tiles", info?.tiles.length === 9);
    await page.screenshot({ path: `${shots}/preview-single.png` });

    if (connected.includes(2)) {
      await card(0).locator("input[name$='.label']").fill("Weddings");
      await card(1).locator("input[name$='.label']").fill("Portraits");
      await setVisible(1, true);
      info = await preview();
      check("both accounts: Weddings and Portraits, 6 each", JSON.stringify(info?.blocks.map((b) => `${b.title}:${b.tiles}`)) === '["Weddings:6","Portraits:6"]', info?.blocks);
      check("both: side by side on desktop", info?.blocks[0].top === info?.blocks[1].top);
      check("both: the picks still lead the first block", JSON.stringify(info?.tiles.slice(0, 2).map((t) => t.alt)) === JSON.stringify([first, second]));
      check("both: each block has its own Follow link", info?.follow.length === 2, info?.follow);
      await page.getByRole("button", { name: "Phone" }).click();
      info = await preview();
      check("both: stacked on a phone", info?.blocks[1].top > info?.blocks[0].top, info?.blocks.map((b) => b.top));
      await page.getByRole("button", { name: "Desktop" }).click();
      await page.screenshot({ path: `${shots}/preview-pair.png` });
    } else {
      r.lines.push("(second account not connected here: two-account preview skipped; covered by tests/unit/instagram-layout)");
    }
  } else {
    r.lines.push("(main account not connected here: grid previews skipped)");
  }

  await setVisible(0, false);
  await setVisible(1, false);
  let info = await preview();
  check("both off: heading and Follow link only, no tiles", info?.tiles.length === 0 && info.follow.length === 1 && Boolean(info.heading), info);
  await page.locator(".show-on-website button[role=switch]").first().click();
  info = await preview();
  check("section off: gone from the page", info === null);
  check("nothing was saved", guard.writes().length === 0, guard.lines());
  await ctx.close();

  section("page");
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
