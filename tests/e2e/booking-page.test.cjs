// The /booking page and its Booking Page editor (globals/Booking.ts,
// components/booking/*): the form wears the same frame as "How it works",
// past dates can't be picked (typed or from the calendar), no "Back to
// home"; after sending, "How it works" goes away, the thank-you is in view
// and focused, its heading capitalizes the first name, the summary line
// stays, and it links to the chosen category's gallery only when there's an
// album to browse. In the editor: "Booking Page" everywhere, steps headed
// "1 · Pick a date", and the new editable words with their defaults.
//
// Sending is faked by the shared guard (lib/guard.cjs): no Inquiry is made,
// no email is sent. Run with `npm run test:e2e booking-page` (see README.md).
const { launchBrowser, newContext, report, outDir, BASE, ADMIN, API } = require("./lib/harness.cjs");

const r = report("booking-page");
const { check, section } = r;
const shots = outDir("booking-page");

async function fill(page, { type, name }) {
  await page.selectOption("#sessionType", type);
  await page.fill("#name", name);
  await page.fill("#email", "test@example.com");
}

(async () => {
  const browser = await launchBrowser();
  // Which categories have an album to browse (the gallery link's rule).
  const probe = await newContext(browser);
  const req = (await probe.ctx.newPage()).request;
  const categories = (await (await req.get(`${API}/categories?where[published][equals]=true&depth=0&limit=50`)).json()).docs;
  const albums = (await (await req.get(`${API}/events?where[published][equals]=true&depth=0&limit=200`)).json()).docs;
  const withAlbums = categories.filter((c) => albums.some((a) => (typeof a.category === "object" ? a.category.id : a.category) === c.id));
  const without = categories.filter((c) => !withAlbums.includes(c));
  r.lines.push(`(categories with an album: ${withAlbums.map((c) => c.name).join(", ") || "none"}; without: ${without.map((c) => c.name).join(", ") || "none"})`);
  await probe.ctx.close();

  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    section(`${w}x${h}`);
    const { ctx, guard } = await newContext(browser, { viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/booking`, { waitUntil: "networkidle", timeout: 120000 });

    const frames = await page.evaluate(() => {
      const look = (el) => {
        const c = getComputedStyle(el);
        return { border: `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`, radius: c.borderTopLeftRadius, bg: c.backgroundColor };
      };
      const how = document.querySelector("section.accent-frame");
      const form = document.querySelector("#booking-form form");
      return { how: how && look(how), form: form && look(form) };
    });
    check("the form has the same outline as How it works", frames.how && frames.form && frames.how.border === frames.form.border && frames.how.radius === frames.form.radius, frames);
    check("and keeps its grey fill", frames.form && frames.form.bg !== frames.how.bg, frames);
    check("no Back to home", (await page.getByRole("link", { name: /back to home/i }).count()) === 0);
    await page.screenshot({ path: `${shots}/${w}-form.png`, fullPage: true });

    // Past dates: typed, then the calendar.
    await page.fill("#date", "01/15/2020");
    await page.locator("#date").blur();
    const dateError = await page.locator("#booking-form").getByText("Choose a date that hasn't passed.").count();
    check("a typed past date is refused", dateError === 1);
    await page.fill("#date", "");
    await page.locator("#date").blur();
    await page.getByRole("button", { name: "Open calendar" }).click();
    const cal = await page.evaluate(() => {
      const dialog = document.querySelector('[aria-label="Choose a date"]');
      const days = [...(dialog?.querySelectorAll("button") ?? [])].filter((b) => /^\d{1,2}$/.test(b.textContent.trim()));
      const today = new Date().getDate();
      return {
        pastDisabled: days.filter((b) => Number(b.textContent) < today).every((b) => b.disabled),
        pastCount: days.filter((b) => Number(b.textContent) < today).length,
        prevMonthDisabled: !!dialog?.querySelector('[aria-label="Previous month"]')?.disabled,
      };
    });
    check("the calendar can't go back before this month", cal.prevMonthDisabled, cal);
    check("past days in the calendar are disabled", cal.pastCount === 0 || cal.pastDisabled, cal);
    await page.keyboard.press("Escape");

    // Send, with a category that has an album to browse.
    const browsable = withAlbums[0];
    if (browsable) {
      await fill(page, { type: browsable.slug, name: "jane doe" });
      await page.selectOption("#time", "afternoon");
      await page.fill("#handle", "janedoe");
      const before = guard.writes().length;
      await page.getByRole("button", { name: "Send your request" }).click();
      await page.locator("#booking-form h2").waitFor({ timeout: 15000 });
      await page.waitForTimeout(700);
      const sent = guard.writes().slice(before).find((wr) => /\/api\/inquiries/.test(wr.url));
      check("sending posts the request (faked)", !!sent, sent?.url);
      const body = JSON.parse(sent?.body ?? "{}");
      check(
        "time and handle are sent as their own fields; the message is just what they typed",
        body.preferredTime === "afternoon" && body.instagramHandle === "janedoe" && body.message === "" && typeof body.category === "number",
        { preferredTime: body.preferredTime, instagramHandle: body.instagramHandle, message: body.message, category: body.category },
      );
      const thanks = await page.evaluate(() => {
        const h2 = document.querySelector("#booking-form h2");
        const r = h2.getBoundingClientRect();
        return { text: h2.textContent.trim(), focused: document.activeElement === h2, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight };
      });
      check('"Thanks, Jane." capitalizes the first name', thanks.text === "Thanks, Jane.", thanks.text);
      check("the thank-you is in view and focused", thanks.focused && thanks.top >= 0 && thanks.bottom <= thanks.vh, thanks);
      const heading = await page.evaluate(() => {
        const h1 = document.querySelector("h1").getBoundingClientRect();
        const header = document.getElementById("site-header")?.getBoundingClientRect().bottom ?? 0;
        return { h1Top: Math.round(h1.top), header: Math.round(header), scrollY: Math.round(scrollY) };
      });
      check("with the page heading above it, not under the sticky header", heading.h1Top >= heading.header, heading);
      check("How it works is gone", (await page.locator("section.accent-frame").count()) === 0);
      const summary = await page.locator("#booking-form section p").nth(1).innerText().catch(() => "");
      check("the summary line stays (session type, time)", summary.includes(browsable.name) && summary.includes("Afternoon"), summary);
      const link = page.getByRole("link", { name: `While you wait, browse the ${browsable.name} gallery` });
      check("it links to that category's gallery", (await link.count()) === 1 && (await link.getAttribute("href")) === `/portfolio/${browsable.slug}`, await link.getAttribute("href").catch(() => null));
      check("no Back to home on the thank-you", (await page.getByRole("link", { name: /back to home/i }).count()) === 0);
      await page.screenshot({ path: `${shots}/${w}-thanks.png`, fullPage: true });
    }

    // A category with nothing to browse, and "Something else": no gallery link.
    for (const [type, label] of [[without[0]?.slug, `${without[0]?.name} (no albums)`], ["other", "Something else"]]) {
      if (!type) continue;
      await page.goto(`${BASE}/booking`, { waitUntil: "networkidle" });
      await fill(page, { type, name: "Ana" });
      await page.getByRole("button", { name: "Send your request" }).click();
      await page.locator("#booking-form h2").waitFor({ timeout: 15000 });
      check(`${label}: no gallery link`, (await page.getByRole("link", { name: /While you wait/ }).count()) === 0);
      check(`${label}: an already-capitalized name is kept`, (await page.locator("#booking-form h2").innerText()) === "Thanks, Ana.");
    }
    check("no page errors", errors.length === 0, errors);
    await ctx.close();
  }

  section("the Booking Page editor");
  const { ctx } = await newContext(browser, { viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/globals/booking`, { timeout: 120000 });
  await page.locator("#field-heading").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  check("title says Booking Page", (await page.title()).includes("Booking Page"), await page.title());
  check("heading says Booking Page", (await page.locator(".doc-header__title, h1").first().innerText()).trim() === "Booking Page");
  check("breadcrumb says Booking Page", (await page.locator(".step-nav").innerText()).includes("Booking Page"), await page.locator(".step-nav").innerText());
  check("sidebar says Booking Page", (await page.locator(".site-nav__label").allInnerTexts()).includes("Booking Page"));
  const labels = await page.locator(".step-row-label").allInnerTexts();
  const saved = (await (await page.request.get(`${API}/globals/booking?depth=0`)).json()).steps ?? [];
  check(
    'each step row says its number and title ("1 · Pick a date")',
    labels.length === saved.length && labels.every((l, i) => l.trim() === `${i + 1} · ${saved[i].title}`),
    labels,
  );
  for (const [id, want] of [
    ["field-howItWorksHeading", "How it works"],
    ["field-submitLabel", "Send your request"],
    ["field-confirmationHeading", "Thanks, {name}."],
  ]) {
    check(`${id.replace("field-", "")} is editable (default "${want}")`, (await page.locator(`#${id}`).inputValue()) === want, await page.locator(`#${id}`).inputValue().catch(() => "missing"));
  }
  check("thank-you message and date help text are editable", (await page.locator("#field-confirmationMessage").count()) === 1 && (await page.locator("#field-dateHelpText").count()) === 1);
  await page.screenshot({ path: `${shots}/editor.png`, fullPage: true });
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
