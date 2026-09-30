// `npm run test:e2e:login`: opens the studio's sign-in page in a visible
// browser, waits for you to sign in, and saves the session to
// tests/e2e/.auth/state.json (gitignored, never commit it) for the tests to
// use. Run it again when the tests say you're signed out. The write guard is
// on here too; only signing in goes through.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { createGuard } = require("./lib/guard.cjs");
const { ADMIN, AUTH, BASE } = require("./lib/harness.cjs");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await createGuard(BASE).install(ctx);
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/login`, { timeout: 180000 });
  console.log("Sign in in the browser window (waiting up to 15 minutes)…");
  await page.waitForURL((url) => url.pathname.startsWith("/hv-studio") && !url.pathname.includes("login"), { timeout: 15 * 60 * 1000 });
  await page.waitForTimeout(1500);
  fs.mkdirSync(path.dirname(AUTH), { recursive: true });
  await ctx.storageState({ path: AUTH });
  console.log(`Signed in. Session saved to ${path.relative(process.cwd(), AUTH)}.`);
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
