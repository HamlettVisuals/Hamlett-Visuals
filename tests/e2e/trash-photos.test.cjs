// Deleted photos in the Trash tab: empty today, then sample deleted photos (swapped into the page data): album note, Delete permanently warns if still used, Restore / Delete requests.
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e trash-photos` (see README.md).
const { launchBrowser, newContext, report, outDir, ADMIN } = require("./lib/harness.cjs");

const r = report("trash-photos");
const { check } = r;
const shots = outDir("trash-photos");


(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1. The real Trash page: the new section, empty today.
  await page.goto(`${ADMIN}/portfolio/trash`, { timeout: 120000 });
  await page.getByText("Deleted photos", { exact: true }).waitFor({ timeout: 60000 });
  check("Deleted photos section, empty today", (await page.locator(".portfolio-trash__section", { hasText: "Deleted photos" }).innerText()).includes("No deleted photos."));
  check("intro mentions photos", (await page.locator(".portfolio-trash__intro").innerText()).includes("categories, albums and photos"));

  // 2. Sample deleted photos. #31 is really the Motorsports cover (in use), #33 is used nowhere.
  const thumb = "/hv-studio/api/photos/file/HV-400x400.png";
  const sample = [
    { id: 31, title: "Indian Larry", deletedAt: "2026-09-30T12:00:00.000Z", thumbnail: { src: thumb, alt: "" }, note: "Not in an album" },
    { id: 33, title: "Hamlett Visuals Logo", deletedAt: "2026-09-29T12:00:00.000Z", thumbnail: { src: thumb, alt: "" }, note: "In Vacation Test (also deleted)" },
  ];
  let swapped = false;
  await page.route("**/hv-studio/portfolio/trash**", async (route) => {
    const req = route.request();
    if (!(req.headers()["rsc"] === "1")) return route.fallback();
    const res = await route.fetch();
    const body = await res.text();
    const next = body.replace('"photos":[]', `"photos":${JSON.stringify(sample)}`);
    swapped = next !== body;
    await route.fulfill({ response: res, body: next });
  });
  const writes = [];
  await page.route(/\/hv-studio\/api\/photos\?/, async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fallback();
    writes.push({ method: req.method(), url: decodeURIComponent(req.url()), body: req.postData() });
    await route.fulfill({ json: { docs: [{ id: 0 }], errors: [], message: "faked" } });
  });

  await page.goto(`${ADMIN}/portfolio`, { timeout: 120000 });
  await page.locator(".portfolio__tabs a", { hasText: "Trash" }).click();
  await page.getByText("Indian Larry").waitFor({ timeout: 30000 });
  check("sample data reached the page (client navigation)", swapped);
  const photoSection = page.locator(".portfolio-trash__section", { hasText: "Deleted photos" });
  check("each photo shows its album note and deletion date", (await photoSection.innerText()).includes("In Vacation Test (also deleted)") && (await photoSection.innerText()).includes("Deleted 30 Sept 2026"), await photoSection.innerText());
  await photoSection.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/10-trash.png` });

  // 3. Delete permanently a photo that's still used: the dialog lists where.
  const row = (text) => photoSection.locator(".portfolio-trash__row", { hasText: text });
  await row("Indian Larry").getByRole("button", { name: "Delete permanently" }).click();
  const modal = page.locator(".confirmation-modal").first();
  await modal.waitFor({ timeout: 15000 });
  const text = await modal.innerText();
  check("warns it's still used (real usage check)", text.includes('the cover of the "Motorsports" category') && text.includes("left without a photo") && text.includes("removed from storage"), text.replace(/\n+/g, " | "));
  await page.screenshot({ path: `${shots}/10-delete-used.png` });
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(500);
  check("cancel sends nothing", writes.length === 0);

  // 4. Delete permanently an unused one: plain dialog; the request is Payload's.
  await row("Hamlett Visuals Logo").getByRole("button", { name: "Delete permanently" }).click();
  await modal.waitFor({ timeout: 15000 });
  const text2 = await modal.innerText();
  check("unused photo: no 'still used' list", !text2.includes("still used") && text2.includes("removed from storage"), text2.replace(/\n+/g, " | "));
  await page.getByRole("button", { name: "Delete permanently" }).last().click();
  await page.waitForTimeout(1500);
  const del = writes.find((w) => w.method === "DELETE");
  check("sends a DELETE for that one photo, only while it's in the Trash", del && del.url.includes("trash=true") && del.url.includes("[id][equals]=33") && del.url.includes("[deletedAt][exists]=true"), del?.url);

  // 5. Restore.
  await row("Indian Larry").getByRole("button", { name: "Restore" }).click();
  await page.waitForTimeout(1500);
  const patch = writes.find((w) => w.method === "PATCH");
  check("Restore sends deletedAt: null for that photo", patch && patch.url.includes("[id][equals]=31") && JSON.parse(patch.body).deletedAt === null, patch && `${patch.url} ${patch.body}`);

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/payload-preferences/.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 300));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
