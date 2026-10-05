// "Sign out everywhere" on the account page (components/admin/
// SignOutEverywhere.tsx): asks first, Cancel backs out, confirming calls
// Payload's logout for every session and goes to the login page. The logout
// call is faked by the shared guard (lib/guard.cjs), so the saved test
// session stays signed in; nothing is saved.
// Run with `npm run test:e2e account-sign-out` (see README.md).
const { launchBrowser, newContext, report, outDir, ADMIN } = require("./lib/harness.cjs");

const r = report("account-sign-out");
const { check, section } = r;
const shots = outDir("account-sign-out");

(async () => {
  const browser = await launchBrowser();
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    section(`${w}x${h}`);
    const { ctx, guard } = await newContext(browser, { viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Every page it asks for (with the logout faked, the still-valid session
    // is sent from the login page straight back into the studio, on the
    // server, so where it ends up isn't the login page).
    const visited = [];
    page.on("request", (req) => req.isNavigationRequest() && req.frame() === page.mainFrame() && visited.push(req.url()));
    await page.goto(`${ADMIN}/account`, { timeout: 120000 });
    const block = page.locator(".sign-out-everywhere");
    await block.waitFor({ timeout: 60000 });
    check("the account page has Sign out everywhere", (await block.getByRole("button", { name: "Sign out everywhere" }).count()) === 1);

    // A tap before the page has finished starting up can be lost; try again.
    for (let i = 0; i < 3 && !(await block.locator(".sign-out-everywhere__question").count()); i++) {
      await block.getByRole("button", { name: "Sign out everywhere" }).click();
      await page.waitForTimeout(600);
    }
    const question = await block.locator(".sign-out-everywhere__question").innerText().catch(() => "");
    check("it asks first", question === "This signs you out on every device, including this one.", question);
    check("nothing was sent yet", !guard.writes().some((w) => /\/logout/.test(w.url)));
    await page.screenshot({ path: `${shots}/${w}-confirm.png` });

    await block.getByRole("button", { name: "Cancel" }).click();
    check("Cancel backs out", (await block.locator(".sign-out-everywhere__question").count()) === 0);
    check("still nothing sent", !guard.writes().some((w) => /\/logout/.test(w.url)));

    await block.getByRole("button", { name: "Sign out everywhere" }).click();
    await Promise.all([
      page.waitForURL(/\/hv-studio\/login/, { timeout: 30000 }).catch(() => {}),
      block.getByRole("button", { name: "Sign out everywhere" }).click(),
    ]);
    const sent = guard.writes().find((w) => /\/logout/.test(w.url));
    check("confirming signs out every session (faked)", sent && /allSessions=true/.test(sent.url), sent?.url);
    await page.waitForTimeout(1500);
    check("then goes to the login page", visited.some((u) => /\/hv-studio\/login/.test(u)), visited.slice(-3));
    check("no page errors", errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
