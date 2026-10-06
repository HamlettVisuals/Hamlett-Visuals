// On phones, every page can scroll its last content clear of the floating
// "Ask a question" button (components/AskQuestion/FloatingAskButton.tsx):
// scrolled to the very bottom, no text is under the button or within 8px of
// it. The footer's bottom padding (Footer.tsx, pb-28) is what makes room, and
// every page ends with the footer. Checks /booking, its thank-you, the
// homepage and /testimonials at three phone sizes, in Chromium and WebKit.
//
// The thank-you's send is faked by the guard (lib/guard.cjs). Run with
// `npm run test:e2e ask-button-clearance`; screenshots of each page's bottom
// at 390 wide go to .output/ask-button-clearance/.
const { launchBrowser, newContext, report, outDir, BASE } = require("./lib/harness.cjs");

const r = report("ask-button-clearance");
const { check, section } = r;
const shots = outDir("ask-button-clearance");
const PAGES = [
  ["/booking", "booking"],
  ["thanks", "booking-thanks"],
  ["/", "home"],
  ["/testimonials", "testimonials"],
];

// Every bit of visible text the button covers, or comes within 8px of.
const covered = (page) =>
  page.evaluate(() => {
    const fab = [...document.querySelectorAll("button")].find((b) => /ask a question/i.test(b.textContent));
    const f = fab.getBoundingClientRect();
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || fab.contains(node)) continue;
      if (node.parentElement.closest("[aria-hidden=true], .visually-hidden, nextjs-portal")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const t of range.getClientRects()) {
        if (t.bottom > f.top - 8 && t.top < f.bottom + 8 && t.right > f.left - 8 && t.left < f.right + 8) hits.push(node.textContent.trim().slice(0, 40));
      }
    }
    const atBottom = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1;
    return { hits, atBottom };
  });

(async () => {
  for (const engine of ["chromium", "webkit"]) {
    const browser = await launchBrowser({ engine });
    for (const [w, h] of [[375, 667], [390, 844], [430, 932]]) {
      section(`${engine} ${w}x${h}`);
      const { ctx } = await newContext(browser, { viewport: { width: w, height: h }, isMobile: engine === "chromium", hasTouch: true });
      const page = await ctx.newPage();
      for (const [path, name] of PAGES) {
        if (path === "thanks") {
          await page.goto(`${BASE}/booking`, { waitUntil: "networkidle", timeout: 120000 });
          await page.selectOption("#sessionType", "other");
          await page.fill("#name", "Ana");
          await page.fill("#email", "ana@example.com");
          await page.getByRole("button", { name: "Send your request" }).click();
          await page.locator("#booking-form h2").waitFor({ timeout: 15000 });
          await page.waitForTimeout(800);
        } else {
          await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 });
        }
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(600);
        const { hits, atBottom } = await covered(page);
        check(`${name}: at the bottom, nothing is under the button`, atBottom && hits.length === 0, hits);
        if (w === 390 && engine === "chromium") await page.screenshot({ path: `${shots}/390-${name}-bottom.png` });
      }
      await ctx.close();
    }
    await browser.close();
  }
})().then(() => r.finish(), (err) => r.finish(err));
